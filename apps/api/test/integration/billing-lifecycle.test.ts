// TIP-039 pha 1 — vòng đời gói trên Postgres thật (DC-242 / DC-243), qua ActionExecutor nguồn system (actor `system:billing`):
//   AC01 kỳ: gói tháng / năm cấp Credit đúng một lần mỗi kỳ tháng (hai lượt song song + replay), plan cũ hết hạn (không cộng dồn), topup nguyên;
//        năm cấp từng tháng (không trước 12 tháng); downtime 3 tháng → chỉ kỳ hiện tại, kỳ lỡ `skipped`; kỳ theo ngày 31 → 28/02 → 31/03.
//   AC02 hoá đơn đã trả ghi nhận lại (hôm sau / gọi trực tiếp lẫn qua webhook) → kỳ / gói / số dư nguyên, một biên nhận.
//   AC03 nâng 16/04 (kỳ 01/04 → 01/05): thu 300.000đ chênh, cộng 5.000 Credit vào plan, giữ ngày hết hạn, topup nguyên; hoá đơn nâng trả sau
//        khi gói đã đổi → giữ đối soát, không cấp; hạ gói → kỳ sau (áp một lần lúc hết kỳ, không xoá tài nguyên).
//   AC04 addon 300.000đ/tháng mua 16/04 → 150.000đ, hết 01/05 cùng gói; hạn mức = gói + addon; ghi nhận lại không cấp đôi; addon cũ (không
//        ảnh chụp) → đối soát, không đoán. Hết kỳ không gia hạn → `expired`, Credit gói hết hạn, topup giữ, dữ liệu giữ 30 ngày.
//   Backfill addon trả trước 039 (kể cả đã fulfilled_at) → dry-run đếm; chạy thật giữ đối soát một lần. EXPLAIN truy vấn mới dùng index.
//   AC10 lỗi sau commit nền tảng → thao tác chờ; khôi phục làm nốt (event tới outbox tenant), không cấp đôi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import {
  ActionExecutor,
  ActionHandlerRegistry,
  InvoiceFulfiller,
  backfillLegacyAddons,
  PlatformOperations,
  QuotaService,
  WalletService,
  billingCtx,
  recoverOperations,
  runLifecycle,
  uuidv7,
  type FaultPoint,
} from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { wallToUtc } from '@appchat/shared';
import pg from 'pg';
import { call, env, startApi, type Harness } from './setup';

const VN = 'Asia/Ho_Chi_Minh';
const at = (d: string, hm = '10:00') => wallToUtc(d, hm, VN);
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any

let resolver: TenantDbResolver;
const opened: Harness[] = [];
const YEAR_PLAN = `t039_year_${uuidv7().slice(-8)}`;

async function ws(start: string) {
  const h = await startApi();
  opened.push(h);
  h.clock.set(at(start));
  resolver ??= new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(h.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
  const trial = await h.platform.plan.findUniqueOrThrow({ where: { key: 'personal_pro' } });
  await h.platform.subscription.create({
    data: {
      id: uuidv7(),
      workspaceId: h.ws,
      planId: trial.id,
      status: 'trialing',
      currentPeriodStart: h.clock.now(),
      trialEndsAt: new Date(h.clock.now().getTime() + 86_400_000),
    },
  });
  const act = (id: string, input: unknown) =>
    call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
  const buy = async (kind: string, item: string, period?: string) => {
    const r = await act('billing.create_invoice', { kind, item, ...(period ? { period } : {}) });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return r.body.data.result.invoice_id as string;
  };
  const f = h.app.get(InvoiceFulfiller, { strict: false });
  const pay = async (id: string) => {
    expect(await f.markPaid(h.platform, id, { method: 'bank_transfer', confirmedBy: h.user })).toBe(true);
    return f.fulfil(id);
  };
  const sweep = () =>
    runLifecycle({
      platform: h.platform,
      executor: h.app.get(ActionExecutor, { strict: false }),
      now: () => h.clock.now(),
    });
  const bal = () => h.app.get(WalletService, { strict: false }).balance(h.ws);
  const sub = () => h.platform.subscription.findUniqueOrThrow({ where: { workspaceId: h.ws } });
  const grants = () =>
    h.platform.billingPeriodGrant.findMany({ where: { workspaceId: h.ws }, orderBy: { periodStart: 'asc' } });
  const outbox = async (topic: string) =>
    (
      await (await resolver.get(TenantContexts.system(h.ws, 't'))).outboxEvent.findMany({ where: { topic } })
    ).map((e) => e.payload as Record<string, unknown>);
  return { h, act, buy, pay, sweep, bal, sub, grants, outbox, f };
}
const credits = async (h: Harness, key: string) =>
  Number((await h.platform.plan.findUniqueOrThrow({ where: { key } })).creditsMonth ?? 0n);

beforeAll(() => undefined, 60_000);
afterAll(async () => {
  for (const h of opened) await h.platform.billingInvoice.deleteMany({ where: { workspaceId: h.ws } });
  await opened[0]?.platform.subscription.deleteMany({
    where: { workspaceId: { in: opened.map((h) => h.ws) } },
  });
  await opened[0]?.platform.plan.deleteMany({ where: { key: YEAR_PLAN } });
  await resolver?.close();
  for (const h of opened) await h.close();
});

describe('AC01 kỳ Credit theo ngày đăng ký', () => {
  it('gói tháng 31/01: kỳ 28/02 → 31/03; mỗi kỳ một lần (song song + replay); plan cũ hết hạn, topup nguyên; hết kỳ → expired', async () => {
    const w = await ws('2027-01-31');
    await w.pay(await w.buy('credit', 'credit_500'));
    await w.pay(await w.buy('plan', 'team', 'month'));
    const team = await credits(w.h, 'team');
    expect(await w.sub()).toMatchObject({
      status: 'active',
      currentPeriodEnd: at('2027-02-28'),
      anchorDay: 31,
      termMonths: 1,
      nextGrantAt: null,
    });
    expect(await w.bal()).toEqual({ plan: team, topup: 500, total: team + 500 });
    // Gia hạn trước hạn → kỳ sau nối tiếp.
    await w.pay(await w.buy('plan', 'team', 'month'));
    expect(await w.sub()).toMatchObject({ pendingEffectiveAt: at('2027-02-28'), pendingMonths: 1 });
    await w.h.app
      .get(WalletService, { strict: false })
      .charge(w.h.ws, 100, { refType: 'ai_step', refId: uuidv7(), source: 'ai' });
    w.h.clock.set(at('2027-02-28', '10:05'));
    await Promise.all([w.sweep(), w.sweep()]);
    await w.sweep();
    expect(await w.sub()).toMatchObject({
      currentPeriodStart: at('2027-02-28'),
      currentPeriodEnd: at('2027-03-31'),
      pendingPlanId: null,
    });
    expect((await w.grants()).map((g) => [g.periodKey, g.status])).toEqual([
      ['2027-01-31', 'granted'],
      ['2027-02-28', 'granted'],
    ]);
    expect(await w.bal()).toEqual({ plan: team, topup: 500, total: team + 500 });
    w.h.clock.set(at('2027-03-31', '10:05'));
    await w.sweep();
    expect(await w.sub()).toMatchObject({ status: 'expired', expiredAt: at('2027-03-31', '10:05') });
    expect((await w.sub()).retainUntil!.getTime() - at('2027-03-31', '10:05').getTime()).toBe(
      30 * 86_400_000,
    );
    expect(await w.bal()).toEqual({ plan: 0, topup: 500, total: 500 });
    expect(await w.outbox('subscription.changed')).toContainEqual(
      expect.objectContaining({ status: 'expired', plan_key: 'team' }),
    );
  });

  it('gói năm cấp từng tháng; downtime 3 tháng → chỉ kỳ hiện tại, kỳ lỡ skipped', async () => {
    const w = await ws('2027-01-15');
    // Seed chưa có giá năm → gói thử riêng của file (xoá ở afterAll).
    const base = await w.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    const team = await w.h.platform.plan.create({
      data: {
        id: uuidv7(),
        key: YEAR_PLAN,
        segment: base.segment,
        name: 'T039 năm',
        priceMonth: base.priceMonth,
        priceYear: base.priceMonth! * 10n,
        creditsMonth: base.creditsMonth,
        maxChannels: base.maxChannels,
        maxAgents: base.maxAgents,
        maxUsers: base.maxUsers,
        active: false,
        sort: 999,
      },
    });
    await w.h.platform.plan.update({ where: { id: team.id }, data: { active: true } });
    await w.pay(await w.buy('plan', YEAR_PLAN, 'year'));
    await w.h.platform.plan.update({ where: { id: team.id }, data: { active: false } });
    expect(await w.sub()).toMatchObject({
      currentPeriodEnd: at('2028-01-15'),
      termMonths: 12,
      nextGrantAt: at('2027-02-15'),
    });
    expect((await w.bal()).plan).toBe(Number(team.creditsMonth));
    w.h.clock.set(at('2027-05-20'));
    await w.sweep();
    const g = await w.grants();
    expect(g.map((x) => [x.periodKey, x.status])).toEqual([
      ['2027-01-15', 'granted'],
      ['2027-02-15', 'skipped'],
      ['2027-03-15', 'skipped'],
      ['2027-04-15', 'skipped'],
      ['2027-05-15', 'granted'],
    ]);
    expect((await w.bal()).plan).toBe(Number(team.creditsMonth));
    expect(await w.sub()).toMatchObject({ nextGrantAt: at('2027-06-15') });
  });
});

describe('AC02 ghi nhận lại hoá đơn đã trả', () => {
  it('fulfil lại hôm sau / scheduler → kỳ, gói, số dư nguyên; một biên nhận', async () => {
    const w = await ws('2027-04-01');
    const id = await w.buy('plan', 'team', 'month');
    expect(await w.pay(id)).toBe(true);
    const before = { sub: await w.sub(), bal: await w.bal() };
    w.h.clock.set(at('2027-04-02'));
    expect(await w.f.fulfil(id)).toBe(false);
    expect(await w.f.fulfilPending()).toBe(0);
    const ex = w.h.app.get(ActionExecutor, { strict: false });
    const again = (await ex.execute(billingCtx(w.h.ws), 'billing.apply_invoice', { invoice_id: id })) as {
      data: { result: { status: string } };
    };
    expect(again.data.result.status).toBe('replayed');
    expect(await w.sub()).toMatchObject({
      currentPeriodStart: before.sub.currentPeriodStart,
      currentPeriodEnd: before.sub.currentPeriodEnd,
      planId: before.sub.planId,
      version: before.sub.version,
    });
    expect(await w.bal()).toEqual(before.bal);
    expect(
      await w.h.platform.creditLedger.count({
        where: { workspaceId: w.h.ws, refType: 'plan_grant', refId: `invoice:${id}` },
      }),
    ).toBe(1);
    expect((await w.outbox('billing.invoice_paid')).filter((e) => e.invoice_id === id)).toHaveLength(1);
  });

  it('HTTP: người dùng / Trợ lý không gọi được action hệ thống', async () => {
    const w = await ws('2027-04-01');
    expect((await w.act('billing.lifecycle_step', {})).status).toBe(403);
    expect((await w.act('billing.apply_invoice', { invoice_id: uuidv7() })).status).toBe(403);
  });
});

describe('AC03 nâng / hạ gói', () => {
  it('nâng 16/04 trong kỳ 01/04 → 01/05: thu chênh × 15/30, Credit chênh × 15/30 vào plan; giữ ngày hết hạn; topup nguyên', async () => {
    const w = await ws('2027-04-01');
    await w.pay(await w.buy('credit', 'credit_500'));
    await w.pay(await w.buy('plan', 'team', 'month'));
    const plan = (k: string) => w.h.platform.plan.findUniqueOrThrow({ where: { key: k } });
    const [team, biz] = [await plan('team'), await plan('business')];
    await w.h.app
      .get(WalletService, { strict: false })
      .charge(w.h.ws, 1_000, { refType: 'ai_step', refId: uuidv7(), source: 'ai' });
    w.h.clock.set(at('2027-04-16'));
    const id = await w.buy('plan', 'business', 'month');
    const inv = await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id } });
    expect(inv.kind).toBe('upgrade_proration');
    expect(inv.amount).toBe((biz.priceMonth! - team.priceMonth!) / 2n);
    const before = (await w.bal()).plan;
    expect(await w.pay(id)).toBe(true);
    const diff = Number(biz.creditsMonth! - team.creditsMonth!) / 2;
    expect(await w.bal()).toEqual({ plan: before + diff, topup: 500, total: before + diff + 500 });
    expect(await w.sub()).toMatchObject({
      planId: biz.id,
      currentPeriodEnd: at('2027-05-01'),
      termPrice: biz.priceMonth,
    });
    // Kỳ sau cấp hạn mức gói mới.
    w.h.clock.set(at('2027-05-01', '10:01'));
    await w.sweep();
    expect(await w.sub()).toMatchObject({ status: 'expired' });
  });

  it('hoá đơn nâng trả sau khi gói đã đổi → giữ đối soát, không cấp; hạ gói → áp từ kỳ sau', async () => {
    const w = await ws('2027-04-01');
    await w.pay(await w.buy('plan', 'business', 'month'));
    w.h.clock.set(at('2027-04-10'));
    const up = await w.buy('plan', 'ultimate', 'month');
    // Hạ gói (trả trước) — đổi version subscription.
    const down = await w.buy('plan', 'team', 'month');
    expect((await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: down } })).kind).toBe('plan');
    await w.pay(down);
    expect(await w.sub()).toMatchObject({ pendingEffectiveAt: at('2027-05-01') });
    const bal = await w.bal();
    expect(await w.pay(up)).toBe(false);
    expect(await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: up } })).toMatchObject({
      holdReason: 'stale_version',
    });
    expect(
      await w.h.platform.reconcileFinding.count({
        where: { workspaceId: w.h.ws, check: 'billing_invoice_hold', reference: up },
      }),
    ).toBe(1);
    expect(await w.bal()).toEqual(bal);
    w.h.clock.set(at('2027-05-01', '10:01'));
    await w.sweep();
    const team = await w.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    expect(await w.sub()).toMatchObject({
      planId: team.id,
      status: 'active',
      currentPeriodEnd: at('2027-06-01'),
      pendingPlanId: null,
    });
    expect((await w.bal()).plan).toBe(Number(team.creditsMonth));
  });
});

describe('AC04 tài nguyên mua thêm', () => {
  it('addon 16/04 → nửa giá, hết 01/05; hạn mức gói + addon; ghi nhận lại không cấp đôi; addon cũ → đối soát', async () => {
    const w = await ws('2027-04-01');
    await w.pay(await w.buy('plan', 'team', 'month'));
    w.h.clock.set(at('2027-04-16'));
    const id = await w.buy('addon', 'addon_channel');
    expect((await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id } })).amount).toBe(100_000n);
    await w.pay(id);
    await w.f.fulfil(id);
    const rows = await w.h.platform.subscriptionAddon.findMany({ where: { workspaceId: w.h.ws } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ resource: 'channels', quantity: 1, endsAt: at('2027-05-01') });
    const q = new QuotaService(w.h.platform, () => w.h.clock.now());
    const team = await w.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    expect((await q.limits(w.h.ws)).channels).toBe(team.maxChannels! + 1);
    w.h.clock.set(at('2027-05-01', '10:01'));
    expect((await q.limits(w.h.ws)).channels).toBe(team.maxChannels);
    // Addon trước 039 (không ảnh chụp) đã trả → giữ đối soát.
    const legacy = await w.h.platform.billingInvoice.create({
      data: {
        id: uuidv7(),
        workspaceId: w.h.ws,
        code: `INV-T-${uuidv7().slice(-6)}`,
        kind: 'addon',
        item: 'addon_user',
        amount: 150_000n,
        status: 'paid',
        paidAt: w.h.clock.now(),
        transferCode: `T${uuidv7().slice(-10)}`,
        qrPayload: 'x',
        expiresAt: w.h.clock.now(),
        createdByUserId: w.h.user,
      },
    });
    expect(await w.f.fulfil(legacy.id)).toBe(false);
    expect(await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: legacy.id } })).toMatchObject({
      holdReason: 'legacy_addon',
    });
    expect(await w.h.platform.subscriptionAddon.count({ where: { invoiceId: legacy.id } })).toBe(0);
  });
});

describe('AC10 lỗi sau commit nền tảng', () => {
  it('ghi nhận: tenant chưa áp → khôi phục làm nốt (event tới outbox), không cấp đôi', async () => {
    const w = await ws('2027-04-01');
    const ops = w.h.app.get(PlatformOperations, { strict: false });
    const id = await w.buy('plan', 'team', 'month');
    let left = 1;
    ops.setFaultHook((p: FaultPoint) => {
      if (p === 'before_tenant' && left-- > 0) throw new Error('fault');
    });
    try {
      await w.pay(id);
    } finally {
      ops.setFaultHook(null);
    }
    expect(
      (await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id } })).fulfilledAt,
    ).not.toBeNull();
    expect((await w.outbox('billing.invoice_paid')).filter((e) => e.invoice_id === id)).toHaveLength(0);
    w.h.clock.advance(60_000);
    const handlers = w.h.app.get(ActionHandlerRegistry, { strict: false });
    await recoverOperations({
      ops,
      defs: new Map(registry.map((a) => [a.id, a])),
      handler: (x) => handlers.get(x),
      now: () => w.h.clock.now(),
    });
    expect((await w.outbox('billing.invoice_paid')).filter((e) => e.invoice_id === id)).toHaveLength(1);
    expect(
      await w.h.platform.creditLedger.count({
        where: { workspaceId: w.h.ws, refType: 'plan_grant', refId: `invoice:${id}` },
      }),
    ).toBe(1);
  });
});

describe('backfill addon cũ + EXPLAIN', () => {
  it('addon trả trước 039 (đã fulfilled_at, không ảnh chụp) → dry-run chỉ đếm; chạy thật giữ đối soát một lần; addon có entitlement bỏ qua', async () => {
    const w = await ws('2027-04-01');
    const old = await w.h.platform.billingInvoice.create({
      data: {
        id: uuidv7(),
        workspaceId: w.h.ws,
        code: `INV-T-${uuidv7().slice(-6)}`,
        kind: 'addon',
        item: 'addon_user',
        amount: 150_000n,
        status: 'paid',
        paidAt: w.h.clock.now(),
        fulfilledAt: w.h.clock.now(),
        transferCode: `T${uuidv7().slice(-10)}`,
        qrPayload: 'x',
        expiresAt: w.h.clock.now(),
        createdByUserId: w.h.user,
      },
    });
    await w.pay(await w.buy('plan', 'team', 'month'));
    const fresh = await w.buy('addon', 'addon_user');
    await w.pay(fresh);
    const deps = { platform: w.h.platform, now: () => w.h.clock.now() };
    const dry = await backfillLegacyAddons(deps);
    expect(dry.dryRun).toBe(true);
    expect(dry.held).toBeGreaterThanOrEqual(1);
    expect(
      (await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: old.id } })).holdReason,
    ).toBeNull();
    await backfillLegacyAddons(deps, { dryRun: false });
    await backfillLegacyAddons(deps, { dryRun: false });
    expect(await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({
      holdReason: 'legacy_addon',
    });
    expect(await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: fresh } })).toMatchObject({
      holdReason: null,
    });
    expect(
      await w.h.platform.reconcileFinding.count({
        where: { reference: old.id, check: 'billing_invoice_hold' },
      }),
    ).toBe(1);
    expect(await w.h.platform.subscriptionAddon.count({ where: { invoiceId: old.id } })).toBe(0);
  });

  it('EXPLAIN: lịch cấp kỳ / hết kỳ / hoá đơn chờ ghi nhận / backfill addon / hạn mức addon dùng index', async () => {
    const c = new pg.Client({ connectionString: env.MIGRATOR_DATABASE_URL });
    await c.connect();
    try {
      await c.query('ANALYZE billing_invoice, subscription, subscription_addon, billing_period_grant');
      await c.query('SET enable_seqscan = off');
      await c.query('SET enable_bitmapscan = off');
      const plan = async (q: string, p: unknown[] = []) =>
        (await c.query(`EXPLAIN ${q}`, p)).rows.map((r) => r['QUERY PLAN'] as string).join('\n');
      const now = new Date();
      expect(
        await plan(
          `SELECT id, workspace_id FROM subscription WHERE status = 'active' AND next_grant_at IS NOT NULL AND next_grant_at <= $1 ORDER BY status, next_grant_at, id LIMIT 100`,
          [now],
        ),
      ).toMatch(/subscription_grant_due_idx/);
      expect(
        await plan(
          `SELECT id, workspace_id FROM subscription WHERE status = 'active' AND anchor_day IS NULL ORDER BY id LIMIT 100`,
        ),
      ).toMatch(/subscription_anchor_missing_idx/);
      expect(
        await plan(
          `SELECT id FROM billing_invoice WHERE status = 'paid' AND fulfilled_at IS NULL AND hold_reason IS NULL ORDER BY paid_at, id LIMIT 50`,
        ),
      ).toMatch(/billing_invoice_paid_unfulfilled_idx/);
      expect(
        await plan(
          `SELECT id FROM billing_invoice WHERE kind = 'addon' AND status = 'paid' AND hold_reason IS NULL AND id > $1 ORDER BY id LIMIT 500`,
          ['00000000-0000-0000-0000-000000000000'],
        ),
      ).toMatch(/billing_invoice_paid_addon_idx/);
      expect(
        await plan(
          `SELECT resource, sum(quantity) FROM subscription_addon WHERE workspace_id = $1 AND status = 'active' AND ends_at > $2 GROUP BY resource`,
          [uuidv7(), now],
        ),
      ).toMatch(/subscription_addon_active_idx/);
      expect(
        await plan(`SELECT id FROM billing_period_grant WHERE workspace_id = $1 AND period_key = $2`, [
          uuidv7(),
          '2027-04-01',
        ]),
      ).toMatch(/billing_period_grant_workspace_id_period_key_key/);
    } finally {
      await c.end();
    }
  });
});
