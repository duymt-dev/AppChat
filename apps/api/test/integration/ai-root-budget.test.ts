// TIP-019b AC1 (Postgres 16 thật): ngân sách gốc chung — run cha + run con cùng gốc, mỗi gốc một lời gọi thật tại một thời điểm (lời
// gọi đồng thời cùng gốc xếp hàng, gốc khác độc lập), credit con cộng subtree mọi tổ tiên + gốc đúng một lần, hết ngân sách → không lời
// gọi / tool kế; rào mềm: usage vượt phần còn lại vẫn ghi đủ (không hứa trần cứng); ví 0 → không gọi model; nhóm tính tiền làm tròn
// một lần theo tổng (0,2 + 0,2 → 1, không 2); EXPLAIN index biên nhận chưa xong.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript, type ToolSpec } from '@appchat/ai';
import { AiRunner, CreditMeter, DbPriceBook, RunStore, WalletService, admitAttempt, createLogger, ensureRootBudget, openAttempt, recordOutcome, releaseAttempt, settleReceipt, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const PROVIDER = `rb-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // 1 credit / 1k in, 1 / 1k out → 200 token = 0,2 credit thô.
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 1 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const wallet = () => h.app.get(WalletService, { strict: false });
const meter = () => new CreditMeter(wallet(), new DbPriceBook(h.platform), h.platform);
const store = async () => new RunStore(await tenant(), () => h.clock.now());
const runner = (script: MockScript) => new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: mockLanguageModel(script, { provider: PROVIDER, model: MODEL }) }])), meter: meter(), log, clock: { now: () => h.clock.now(), timeZone: async () => 'Asia/Ho_Chi_Minh' } });
const spec = (tools: ToolSpec[] = []) => ({ system: 'test', messages: [{ role: 'user' as const, content: 'xin chào' }], tools, maxSteps: 8, source: 'assistant' });
const balance = async () => (await wallet().balance(h.ws)).total;

describe('ngân sách gốc + biên nhận', () => {
  it('run cha + con: credit con vào subtree cha + gốc đúng một lần; sổ ví = tổng bước', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 50 });
    const child = await s.create({ kind: 'delegate', tier: 'standard', input: {}, parentRunId: root.id, maxCredits: 20 });
    const before = await balance();
    const r = await runner([{ text: 'xong', tokensIn: 1500, tokensOut: 600 }]).start(h.ws, s, child, spec());
    expect(r.status).toBe('completed');
    expect(r.creditsUsed).toBe(3);
    const db = await tenant();
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: child.id } })).creditsUsed).toBe(3);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: root.id } })).subtreeCredits).toBe(3);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: root.id } })).creditsUsed).toBe(0);
    expect(await db.aiRootBudget.findUniqueOrThrow({ where: { rootRunId: root.id } })).toMatchObject({ charged: 3, observed: 3, activeAttemptId: null, quarantined: false });
    expect(before - (await balance())).toBe(3);
    const steps = await db.aiRunStep.findMany({ where: { runId: child.id, type: 'llm' } });
    expect(steps.map((x) => x.credits)).toEqual([3]);
    // Blueprint §5.1: chi phí thô (giá đã chụp, chưa làm tròn) trên bước llm — 1500 + 600 token × 1 credit / 1k = 2,1.
    expect(Number((steps[0]!.meta as { provider_cost?: string }).provider_cost)).toBeCloseTo(2.1, 6);
  });

  it('rào mềm: usage vượt phần còn lại vẫn ghi đủ, sau đó không tool / lời gọi kế (stop budget)', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 2 });
    const calls: unknown[] = [];
    const t: ToolSpec = { name: 'lookup', description: 'lookup', inputSchema: { type: 'object', properties: {} }, origin: 'action', execute: async (i) => (calls.push(i), { kind: 'ok', output: {} }) };
    const r = await runner([{ tool: 'lookup', input: {}, tokensIn: 4000, tokensOut: 1000 }, { text: 'không tới' }]).start(h.ws, s, root, spec([t]));
    expect(r).toMatchObject({ status: 'failed', stopReason: 'budget', creditsUsed: 5, error: { code: 'BUDGET' } }); // DC-380: dừng an toàn không còn là completed
    expect(calls).toEqual([]);
    const db = await tenant();
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: root.id } })).toMatchObject({ status: 'failed', stopReason: 'budget' });
    expect((await db.aiRootBudget.findUniqueOrThrow({ where: { rootRunId: root.id } })).observed).toBe(5);
    // Lượt sau trong cùng gốc bị chặn trước khi gọi model.
    const again = await s.create({ kind: 'delegate', tier: 'standard', input: {}, parentRunId: root.id });
    const r2 = await runner([{ text: 'x' }]).start(h.ws, s, again, spec());
    expect(r2.stopReason).toBe('budget');
  });

  it('một lời gọi / gốc: lời gọi thứ hai cùng gốc chờ; gốc khác độc lập', async () => {
    const s = await store();
    const db = await tenant();
    const a = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 100 });
    const b = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 100 });
    await ensureRootBudget(db, a.id);
    const now = () => h.clock.now();
    const x1 = uuidv7();
    await admitAttempt(db, { rootRunId: a.id, runId: a.id, attemptId: x1, now });
    await expect(admitAttempt(db, { rootRunId: a.id, runId: a.id, attemptId: uuidv7(), now, waitMs: 0 })).rejects.toMatchObject({ fields: { root: 'busy' } });
    await admitAttempt(db, { rootRunId: b.id, runId: b.id, attemptId: uuidv7(), now });
    const waiting = admitAttempt(db, { rootRunId: a.id, runId: a.id, attemptId: uuidv7(), now: () => new Date(), waitMs: 5_000 });
    await new Promise((r) => setTimeout(r, 300));
    await releaseAttempt(db, a.id, x1, now());
    await expect(waiting).resolves.toBeUndefined();
  });

  it('nhóm tính tiền: 0,2 + 0,2 credit thô → trừ tổng 1 (không 2); quyết toán lặp lại không trừ thêm', async () => {
    const s = await store();
    const db = await tenant();
    const run = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 100 });
    await ensureRootBudget(db, run.id);
    const price = { per1kIn: 1, per1kOut: 1 };
    const before = await balance();
    const d = { db, wallet: meter().usage, workspaceId: h.ws, now: () => h.clock.now() };
    let total = 0;
    for (const batch of [0, 1]) {
      const r = await openAttempt(db, { runId: run.id, rootRunId: run.id, kind: 'chat', logicalStep: 0, candidate: 0, batch }, { provider: PROVIDER, model: MODEL, price, source: 'kb' }, h.clock.now());
      await recordOutcome(db, r.id, { kind: 'usage', tokensIn: 150, tokensOut: 50, latencyMs: 1 }, h.clock.now());
      total += (await settleReceipt(d, r.id, { source: 'kb' })).credits;
      expect((await settleReceipt(d, r.id, { source: 'kb' })).credits).toBeLessThanOrEqual(1);
    }
    expect(total).toBe(1);
    expect(before - (await balance())).toBe(1);
    expect((await db.aiUsageGroup.findUniqueOrThrow({ where: { id: `${run.id}:chat:0` } })).charged).toBe(1);
  });

  it('ví 0 → không gọi model (CREDIT_EXHAUSTED, không biên nhận)', async () => {
    const w = wallet();
    const bal = await balance();
    await w.adjust(h.ws, -(await w.balance(h.ws)).topup, { refType: 'test', refId: uuidv7() });
    const plan = (await w.balance(h.ws)).plan;
    if (plan > 0) await w.charge(h.ws, plan, { refType: 'test', refId: uuidv7() });
    try {
      const s = await store();
      const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 50 });
      const model = mockLanguageModel([{ text: 'x' }], { provider: PROVIDER, model: MODEL });
      const r = await new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: meter(), log }).start(h.ws, s, root, spec());
      expect(r).toMatchObject({ status: 'failed', error: { code: 'CREDIT_EXHAUSTED' } });
      expect(model.calls).toBe(0);
      expect(await (await tenant()).aiUsageReceipt.count({ where: { runId: root.id } })).toBe(0);
    } finally {
      await w.topup(h.ws, bal, { refType: 'test', refId: uuidv7() });
    }
  });

  it('EXPLAIN: biên nhận chưa xong theo partial index', async () => {
    const db = await tenant();
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id, root_run_id FROM ai_usage_receipt WHERE status IN ('dispatched','usage_known','unknown') AND updated_at < now() ORDER BY status, updated_at, id LIMIT 50`)).map((r) => r['QUERY PLAN']).join(' | ');
    await db.$executeRawUnsafe('RESET enable_seqscan');
    expect(plan).toMatch(/ai_usage_receipt_unresolved_idx/);
  });
});
