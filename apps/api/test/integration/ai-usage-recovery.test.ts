// TIP-019b AC2 (Postgres 16 thật, hai DB): sự cố ở từng ranh giới — (a) sau khi ghi usage, trước khi trừ ví; (b) ví đã trừ, tenant
// chưa ghi; (c) tenant đã ghi — khôi phục / chạy lại trừ ví ĐÚNG một lần, giữ số tiền gốc dù giá đổi sau đó, bộ đếm run / gốc cộng một
// lần. Lời gọi bị gián đoạn (biên nhận `dispatched` của tiến trình chết) → không gửi lại, cách ly gốc. Ví không đủ → `denied`, không âm.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource } from '@appchat/ai';
import { AiRunner, CreditMeter, type UsageCharge, DbPriceBook, RunStore, WalletService, createLogger, ensureRootBudget, openAttempt, recordOutcome, recoverUsage, settleReceipt, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const PROVIDER = `ur-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 2, creditsPer1kOut: 2 } });
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
const balance = async () => (await wallet().balance(h.ws)).total;
const price = { per1kIn: 2, per1kOut: 2 };

async function knownUsage() {
  const db = await tenant();
  const run = await new RunStore(db, () => h.clock.now()).create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 100 });
  await ensureRootBudget(db, run.id);
  const r = await openAttempt(db, { runId: run.id, rootRunId: run.id, kind: 'chat', logicalStep: 0, candidate: 0 }, { provider: PROVIDER, model: MODEL, price, source: 'assistant' }, h.clock.now());
  await recordOutcome(db, r.id, { kind: 'usage', tokensIn: 1000, tokensOut: 500, latencyMs: 5 }, h.clock.now());
  return { db, run, receipt: r.id };
}
const deps = async () => ({ db: await tenant(), wallet: meter().usage, workspaceId: h.ws, now: () => h.clock.now() });
const recover = async () => {
  h.clock.advance(2 * 60_000);
  return recoverUsage({ platform: h.platform, tenants: resolver, wallet: meter().usage!, now: () => h.clock.now() });
};

describe('khôi phục usage hai DB', () => {
  it('(a) usage đã ghi, chưa trừ ví → khôi phục trừ đúng 3, cộng run / gốc một lần', async () => {
    const { db, run } = await knownUsage();
    const before = await balance();
    const rep = await recover();
    expect(rep.settled).toBeGreaterThanOrEqual(1);
    expect(before - (await balance())).toBe(3);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run.id } })).creditsUsed).toBe(3);
    await recover();
    expect(before - (await balance())).toBe(3);
    expect((await db.aiRootBudget.findUniqueOrThrow({ where: { rootRunId: run.id } })).charged).toBe(3);
  });

  it('(b) ví đã trừ, tenant chưa ghi; giá đổi sau đó → chạy lại giữ số gốc, không trừ lần hai', async () => {
    const { db, run, receipt } = await knownUsage();
    const before = await balance();
    // Mô phỏng: lượt `intent` + trừ ví xong, tiến trình chết trước transaction tenant.
    const d = await deps();
    await settleReceipt({ ...d, wallet: { charge: async (u: UsageCharge) => { const c = await meter().usage!.charge(u); throw Object.assign(new Error('crash'), { c }); }, lookup: meter().usage!.lookup.bind(meter().usage) } as never }, receipt, { source: 'assistant' }).catch(() => undefined);
    expect(before - (await balance())).toBe(3);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run.id } })).creditsUsed).toBe(0);
    await h.platform.modelPrice.update({ where: { providerKey_model: { providerKey: PROVIDER, model: MODEL } }, data: { creditsPer1kIn: 50, creditsPer1kOut: 50 } });
    try {
      const s = await settleReceipt(d, receipt, { source: 'assistant' });
      expect(s.credits).toBe(3);
      expect(before - (await balance())).toBe(3);
      expect((await db.aiRun.findUniqueOrThrow({ where: { id: run.id } })).creditsUsed).toBe(3);
      expect((await db.aiRunStep.findMany({ where: { runId: run.id, type: 'llm' } })).map((x) => x.credits)).toEqual([3]);
    } finally {
      await h.platform.modelPrice.update({ where: { providerKey_model: { providerKey: PROVIDER, model: MODEL } }, data: { creditsPer1kIn: 2, creditsPer1kOut: 2 } });
    }
  });

  it('(c) tenant đã ghi → chạy lại / khôi phục không cộng thêm', async () => {
    const { db, run, receipt } = await knownUsage();
    const d = await deps();
    const before = await balance();
    await settleReceipt(d, receipt, { source: 'assistant' });
    await settleReceipt(d, receipt, { source: 'assistant' });
    await recover();
    expect(before - (await balance())).toBe(3);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run.id } })).creditsUsed).toBe(3);
    expect(await db.aiUsageSettlement.count({ where: { receiptId: receipt } })).toBe(1);
  });

  it('lời gọi bị gián đoạn: chạy lại không gửi lại model, cách ly gốc, run lỗi USAGE_UNKNOWN', async () => {
    const db = await tenant();
    const s = new RunStore(db, () => h.clock.now());
    const run = await s.create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 100 });
    await ensureRootBudget(db, run.id);
    // Tiến trình trước đã ghi biên nhận bước 0 / ứng viên 0 rồi chết khi đang gọi.
    await openAttempt(db, { runId: run.id, rootRunId: run.id, kind: 'chat', logicalStep: 0, candidate: 0 }, { provider: PROVIDER, model: MODEL, price, source: 'assistant' }, h.clock.now());
    const model = mockLanguageModel([{ text: 'không được gọi' }], { provider: PROVIDER, model: MODEL });
    const r = await new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: meter(), log: createLogger({ level: 'silent' }), clock: { now: () => h.clock.now(), timeZone: async () => 'Asia/Ho_Chi_Minh' } }).start(h.ws, s, run, { system: 's', messages: [{ role: 'user', content: 'x' }], tools: [], maxSteps: 4, source: 'assistant' });
    expect(r).toMatchObject({ status: 'failed', error: { code: 'USAGE_UNKNOWN' } });
    expect(model.calls).toBe(0);
    expect((await db.aiRootBudget.findUniqueOrThrow({ where: { rootRunId: run.id } })).quarantined).toBe(true);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run.id } })).stopReason).toBe('usage_unknown');
    const rep = await recover();
    expect(rep.unresolved).toBeGreaterThanOrEqual(1);
  });

  it('ví không đủ cho usage thật → denied, ghi unbilled, không âm, không trừ một phần', async () => {
    const { db, run, receipt } = await knownUsage();
    const w = wallet();
    const bal = await w.balance(h.ws);
    if (bal.topup > 0) await w.adjust(h.ws, -bal.topup, { refType: 'test', refId: uuidv7() });
    if (bal.plan > 0) await w.charge(h.ws, bal.plan, { refType: 'test', refId: uuidv7() });
    await w.topup(h.ws, 1, { refType: 'test', refId: uuidv7() });
    try {
      await expect(settleReceipt(await deps(), receipt, { source: 'assistant' })).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
      expect((await w.balance(h.ws)).total).toBe(1);
      expect(await db.aiRootBudget.findUniqueOrThrow({ where: { rootRunId: run.id } })).toMatchObject({ charged: 0, observed: 3, unbilled: 3 });
      expect((await db.aiUsageReceipt.findUniqueOrThrow({ where: { id: receipt } })).status).toBe('denied');
    } finally {
      await w.topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
    }
  });
});
