// TIP-009 AC1–AC9 trên Postgres 16 + Memurai: migration 009 (CHECK, unique ledger), seed gói, trial khi khai báo DN (event
// thật qua outbox → events → consumer billing.trial), charge (thứ tự trừ, thiếu, idempotent, song song), CreditMeter, ngưỡng
// (credits.* + thông báo Owner), hết trial (scheduler), hạn mức, GET /v1/billing/* + /v1/me.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CreditMeter,
  MemoryRealtimeEmitter,
  QuotaService,
  StaticPriceBook,
  SubscriptionsService,
  WalletService,
  seedPlans,
  uuidv7,
} from '@appchat/core';
import { PLAN_SEEDS, billingCatalogSchema, billingSummarySchema, ledgerPageSchema, walletSchema } from '@appchat/shared';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let w: WorkerHarness;
let resolver: TenantDbResolver;
const emitter = new MemoryRealtimeEmitter();

beforeAll(async () => {
  h = await startApi();
  w = await startWorker(h.platform, { clock: h.clock, emitter });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await resolver?.close();
  await w?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const wallet = () => w.app.get(WalletService, { strict: false });
const subs = () => w.app.get(SubscriptionsService, { strict: false });
const outboxTopics = async () => (await (await resolver.get(TenantContexts.system(h.ws, 't'))).outboxEvent.findMany({ orderBy: { createdAt: 'asc' } })).map((e) => e.topic);
const declare = () =>
  call(h, '/actions/business_profile.update', { input: { kind: 'enterprise', tax_code: '0312345678', legal_name: 'CÔNG TY TNHH A', address: 'Q1', business_description: 'Spa' } });

describe('schema + seed', () => {
  it('AC1 CHECK ví ≥ 0; unique ledger (workspace, ref_type, ref_id); index ledger INCLUDE', async () => {
    const ws = uuidv7();
    await h.platform.creditWallet.create({ data: { workspaceId: ws } });
    try {
      await expect(h.platform.creditWallet.update({ where: { workspaceId: ws }, data: { planBalance: -1n } })).rejects.toThrow(/credit_wallet_balance_chk/);
      const row = { workspaceId: ws, delta: 1n, balanceAfter: 1n, kind: 'adjust' as const, refType: 't', refId: 'r1' };
      await h.platform.creditLedger.create({ data: { id: uuidv7(), ...row } });
      await expect(h.platform.creditLedger.create({ data: { id: uuidv7(), ...row } })).rejects.toThrow();
      const idx = await h.platform.$queryRaw<{ indexdef: string }[]>`SELECT indexdef FROM pg_indexes WHERE indexname = 'credit_ledger_ws_created_idx'`;
      expect(idx[0]!.indexdef).toContain('INCLUDE (delta, kind)');
    } finally {
      await h.platform.creditLedger.deleteMany({ where: { workspaceId: ws } });
      await h.platform.creditWallet.delete({ where: { workspaceId: ws } });
    }
  });

  it('AC2 seed 8 gói như prototype; chạy lại không thêm; gói Miễn phí lưu trữ sau 90 ngày', async () => {
    expect(await seedPlans(h.platform)).toBe(0);
    const plans = await h.platform.plan.findMany({ where: { key: { in: PLAN_SEEDS.map((p) => p.key) } }, orderBy: { sort: 'asc' } });
    expect(plans.map((p) => p.key)).toEqual(PLAN_SEEDS.map((p) => p.key));
    const free = plans.find((p) => p.key === 'free')!;
    expect(free).toMatchObject({ archiveInactiveDays: 90, creditsMonth: 500n, maxChannels: 1 });
    expect(plans.find((p) => p.key === 'personal_pro')).toMatchObject({ isTrialPlan: true, creditsMonth: 10_000n, priceMonth: 5_090_000n });
  });
});

describe('trial', () => {
  it('AC3 khai báo DN → trial Cá nhân Pro 15 ngày + 10.000 credit; event chạy lại không cấp thêm', async () => {
    expect((await declare()).status).toBe(200);
    expect(await until(async () => !!(await h.platform.subscription.findUnique({ where: { workspaceId: h.ws } })))).toBe(true);
    const s = await h.platform.subscription.findUniqueOrThrow({ where: { workspaceId: h.ws } });
    expect(s).toMatchObject({ status: 'trialing', trialEndsAt: new Date('2026-11-14T08:00:00.000Z') });
    expect(await wallet().balance(h.ws)).toEqual({ plan: 10_000, topup: 0, total: 10_000 });
    expect(await subs().startTrial(h.ws)).toBe(false);
    expect(await h.platform.creditLedger.count({ where: { workspaceId: h.ws, kind: 'grant' } })).toBe(1);
    expect(await until(async () => (await outboxTopics()).includes('subscription.changed'))).toBe(true);
  });
});

describe('ví credit', () => {
  it('AC4 trừ plan trước rồi topup; thiếu → CREDIT_EXHAUSTED, không đổi; cùng ref → một lần; 20 charge song song không âm', async () => {
    const ws = h.ws;
    await wallet().topup(ws, 100, { refType: 'test_topup', refId: 't1', note: 'topup', meta: { credits: 100 }, source: 'qr' });
    expect(await wallet().balance(ws)).toEqual({ plan: 10_000, topup: 100, total: 10_100 });
    await wallet().charge(ws, 10_050, { refType: 'test', refId: 'c1', source: 'assistant' });
    expect(await wallet().balance(ws)).toEqual({ plan: 0, topup: 50, total: 50 });
    await expect(wallet().charge(ws, 51, { refType: 'test', refId: 'c2' })).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED', httpStatus: 402 });
    expect((await wallet().balance(ws)).total).toBe(50);
    const again = await wallet().charge(ws, 10_050, { refType: 'test', refId: 'c1' });
    expect(again.applied).toBe(false);
    expect((await wallet().balance(ws)).total).toBe(50);

    await wallet().topup(ws, 30, { refType: 'test_topup', refId: 't2' });
    const r = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => wallet().charge(ws, 5, { refType: 'par', refId: `p${i}` })));
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(16);
    expect(r.filter((x) => x.status === 'rejected').every((x) => (x as PromiseRejectedResult).reason.code === 'CREDIT_EXHAUSTED')).toBe(true);
    expect(await wallet().balance(ws)).toEqual({ plan: 0, topup: 0, total: 0 });
  });

  it('AC5 CreditMeter: đơn giá làm tròn lên, ref ai_step; ví 0 → assertBalance CREDIT_EXHAUSTED', async () => {
    const meter = new CreditMeter(wallet(), new StaticPriceBook({ 'mock:m1': { per1kIn: 2, per1kOut: 6 } }));
    await expect(meter.assertBalance(h.ws)).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
    await wallet().topup(h.ws, 1000, { refType: 'test_topup', refId: 't3' });
    const out = await meter.charge({ workspaceId: h.ws, provider: 'mock', model: 'm1', tokensIn: 1000, tokensOut: 333, runId: 'run1', stepIdx: 0, source: 'assistant' });
    expect(out.credits).toBe(4);
    expect(await h.platform.creditLedger.findUnique({ where: { workspaceId_refType_refId: { workspaceId: h.ws, refType: 'ai_step', refId: 'run1:0' } } })).toMatchObject({ delta: -4n, model: 'm1', tokensIn: 1000 });
    await meter.charge({ workspaceId: h.ws, provider: 'mock', model: 'm1', tokensIn: 1000, tokensOut: 333, runId: 'run1', stepIdx: 0 });
    expect((await wallet().balance(h.ws)).total).toBe(996);
    await expect(meter.charge({ workspaceId: h.ws, provider: 'x', model: 'y', tokensIn: 1, tokensOut: 1, runId: 'r', stepIdx: 0 })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('AC6 ngưỡng: credits.exhausted (đã chạm ở AC4) → nạp → credits.restored; ≤ 20% hạn mức → credits.low một lần; Owner nhận ai_budget', async () => {
    expect(await until(async () => (await outboxTopics()).includes('credits.restored'))).toBe(true);
    const topics = await outboxTopics();
    expect(topics.indexOf('credits.exhausted')).toBeLessThan(topics.indexOf('credits.restored'));
    // Kỳ mới (xoá mốc cảnh báo kỳ trước): 10.000 credit gói; dùng 8.000 → còn 20% → mức 80 (một lần); thêm 1.600 → còn 4% → 95.
    const lowsBefore = (await outboxTopics()).filter((t) => t === 'credits.low').length;
    await wallet().resetPlan(h.ws, 10_000, { refType: 'plan_grant', refId: 'period:test', note: 'plan_grant', meta: { plan: 'Cá nhân Pro' }, source: 'plan' });
    await wallet().charge(h.ws, 8_000, { refType: 'test', refId: 'w1' });
    await wallet().charge(h.ws, 10, { refType: 'test', refId: 'w2' });
    await wallet().charge(h.ws, 1_600, { refType: 'test', refId: 'w3' });
    expect(await until(async () => (await outboxTopics()).filter((t) => t === 'credits.low').length === lowsBefore + 2)).toBe(true);
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    const lows = await db.outboxEvent.findMany({ where: { topic: 'credits.low' }, orderBy: { createdAt: 'asc' } });
    expect(lows.slice(lowsBefore).map((e) => (e.payload as { level: number }).level)).toEqual([80, 95]);
    expect(await until(async () => (await db.notification.count({ where: { userId: h.user, type: 'ai_budget' } })) >= 2)).toBe(true);
  });
});

describe('hết trial', () => {
  it('AC7 scheduler: quá hạn → gói Miễn phí active, trial.expired + subscription.changed, thông báo Owner; dữ liệu giữ nguyên', async () => {
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    const keep = await db.notification.count();
    h.clock.advance(16 * 86_400_000);
    try {
      expect(await subs().expireTrials()).toContain(h.ws);
      expect(await subs().expireTrials()).not.toContain(h.ws);
      const s = await h.platform.subscription.findUniqueOrThrow({ where: { workspaceId: h.ws } });
      const free = await h.platform.plan.findUniqueOrThrow({ where: { key: 'free' } });
      expect(s).toMatchObject({ status: 'active', planId: free.id });
      expect((await wallet().balance(h.ws)).plan).toBe(500);
      expect(await until(async () => (await outboxTopics()).includes('trial.expired'))).toBe(true);
      expect(await until(async () => (await db.notification.count({ where: { userId: h.user, type: 'billing_invoice' } })) === 1)).toBe(true);
      expect(await db.notification.count()).toBeGreaterThanOrEqual(keep);
    } finally {
      h.clock.advance(-16 * 86_400_000);
    }
  });
});

describe('hạn mức', () => {
  it('AC8 vượt hạn mức → PLAN_LIMIT_REACHED 402 { resource, limit }; gói không giới hạn luôn qua', async () => {
    const q = new QuotaService(h.platform);
    expect(await q.limits(h.ws)).toMatchObject({ planKey: 'free', users: 1, channels: 1, agents: 1 });
    await q.assert(h.ws, 'channels', 0);
    await expect(q.assert(h.ws, 'channels', 1)).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED', httpStatus: 402, fields: { resource: 'channels', limit: '1' } });
    await subs().activate(h.ws, 'ultimate', 1, 'inv-test-1');
    await q.assert(h.ws, 'channels', 10_000);
    await expect(q.assert(h.ws, 'users', 15)).rejects.toMatchObject({ fields: { resource: 'users', limit: '15' } });
    // activate idempotent theo hoá đơn.
    await subs().activate(h.ws, 'ultimate', 1, 'inv-test-1');
    expect(await h.platform.creditLedger.count({ where: { workspaceId: h.ws, refType: 'plan_grant', refId: 'invoice:inv-test-1' } })).toBe(1);
    expect((await wallet().balance(h.ws)).plan).toBe(200_000);
  });
});

describe('GET /v1/billing/* + /v1/me', () => {
  it('AC9 summary / plans / wallet / ledger đúng shape dùng chung; /me có plan + billing', async () => {
    const sum = await json(await call(h, '/billing/summary'));
    expect(billingSummarySchema.safeParse(sum.body.data).success).toBe(true);
    expect(sum.body.data).toMatchObject({ plan_key: 'ultimate', plan_name: 'Ultimate', status: 'active', users: { used: 1, max: 15 }, channels: { used: 0, max: null }, credits_month: 200_000, plan_balance: 200_000 });
    const plans = await json(await call(h, '/billing/plans'));
    expect(billingCatalogSchema.safeParse(plans.body.data).success).toBe(true);
    expect(plans.body.data.plans.personal.map((p: { key: string }) => p.key)).toEqual(['free', 'personal', 'personal_pro', 'personal_max']);
    const wal = await json(await call(h, '/billing/wallet'));
    expect(walletSchema.safeParse(wal.body.data).success).toBe(true);
    // Lịch sử theo locale người xem; (đồng hồ test lùi lại sau AC7 nên không so thứ tự dòng đầu).
    expect(wal.body.data.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'grant', desc: 'Cấp credit gói Ultimate', source: 'Gói' })]));
    expect(wal.body.data.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'usage', desc: 'AI · 1333 token', source: 'Trợ lý AI', delta: -4 })]));
    const first = await json(await call(h, '/billing/ledger?limit=5'));
    expect(ledgerPageSchema.safeParse(first.body).success).toBe(true);
    expect(first.body.data).toHaveLength(5);
    const next = await json(await call(h, `/billing/ledger?limit=5&cursor=${first.body.next_cursor}`));
    expect(next.body.data[0].id).not.toBe(first.body.data[4].id);
    expect(new Date(next.body.data[0].at).getTime()).toBeLessThanOrEqual(new Date(first.body.data[4].at).getTime());

    const me = await json(await call(h, '/me'));
    expect(me.body.data.workspaces.find((x: { id: string }) => x.id === h.ws)).toMatchObject({ plan: 'Ultimate', trial_ends_at: null });
    expect(me.body.data.billing).toMatchObject({ trial_days_left: 0, paid_plan: 'ultimate' });
    expect((await fetch(`${h.base}/v1/billing/summary`)).status).toBe(401);
  });
});
