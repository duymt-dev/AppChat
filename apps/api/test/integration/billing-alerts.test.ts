// TIP-039 pha 2 trên Postgres thật:
//   AC06 wallet.update_alerts — Owner bật / tắt nhắc 80 / 95% (persist, before / after vào action_log); Sales (không billing.manage) 403;
//        tắt nhắc vẫn chặn AI khi hết (CREDIT_EXHAUSTED) — chỉ thôi thông báo Owner ở mốc 80 / 95.
//   AC05 hết Credit bền — event `credits.exhausted` qua outbox → consumer `ai.credit-handoff`: chỉ hội thoại `auto` đang rảnh / chạy sang
//        người (lý do credit, outbox `ai.handoff`); copilot / AI tắt / đã có người / đóng không đụng; event trễ sau khi nạp (ví > 0) không
//        chuyển; chạy lại không chuyển đôi; `credits.restored` không tự giành lại hội thoại đã chuyển.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, REDIS, WalletService, handoffForCredit, uuidv7, type CreditHandoffDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let acc: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const wallet = () => h.app.get(WalletService, { strict: false });
const deps = (): CreditHandoffDeps => ({
  balance: async (ws) => (await wallet().balance(ws)).total,
  kv: h.app.get(REDIS, { strict: false }),
  now: () => h.clock.now(),
  executor: h.app.get(ActionExecutor, { strict: false }),
  tenants: resolver,
});

async function conv(
  o: {
    aiMode?: 'off' | 'copilot' | 'auto';
    aiState?: 'idle' | 'running' | 'handoff' | 'waiting_approval';
    status?: 'open' | 'closed';
  } = {},
) {
  const id = uuidv7();
  h.clock.advance(1000);
  await db.conversation.create({
    data: {
      id,
      channelAccountId: acc,
      channelType: 'webchat',
      externalThreadId: `t-${id}`,
      aiMode: o.aiMode ?? 'auto',
      aiState: o.aiState ?? 'idle',
      status: o.status ?? 'open',
      lastMessageAt: h.clock.now(),
    },
  });
  return id;
}
const state = async (id: string) =>
  db.conversation.findUniqueOrThrow({
    where: { id },
    select: { aiMode: true, aiState: true, handoffReason: true },
  });
const drain = async () => {
  const w = wallet();
  const b = await w.balance(h.ws);
  if (b.total > 0) await w.charge(h.ws, b.total, { refType: 'ai_step', refId: uuidv7(), source: 'ai' });
};

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(h.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
  db = await resolver.get(TenantContexts.system(h.ws, 'billing-alerts-test'));
  expect((await act('webchat.update_widget', { enabled: true, name: 'Web Spa' })).status).toBe(200);
  acc = (await db.channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC06 wallet.update_alerts', () => {
  it('Owner tắt / bật → persist + action_log before / after; tắt nhắc không tắt chặn AI', async () => {
    const off = await act('wallet.update_alerts', { low_alert: false });
    expect(off.status, JSON.stringify(off.body)).toBe(200);
    expect((await h.platform.creditWallet.findUniqueOrThrow({ where: { workspaceId: h.ws } })).lowAlert).toBe(
      false,
    );
    const log = await db.actionLog.findUniqueOrThrow({ where: { id: off.body.data.action_log_id } });
    expect(log).toMatchObject({
      actionId: 'wallet.update_alerts',
      before: { low_alert: true },
      after: { low_alert: false },
    });
    // Đọc lại (reload) thấy đúng giá trị.
    expect((await json(await call(h, '/billing/wallet'))).body.data.low_alert).toBe(false);
    await drain();
    await expect(wallet().assertBalance(h.ws)).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
    expect((await act('wallet.update_alerts', { low_alert: true })).status).toBe(200);
    expect((await h.platform.creditWallet.findUniqueOrThrow({ where: { workspaceId: h.ws } })).lowAlert).toBe(
      true,
    );
  });

  it('preview Trợ lý ghi trạng thái hiện tại → đổi; Sales (không billing.manage) 403; agent không được cấp', async () => {
    const p = await act('wallet.update_alerts', { low_alert: false }, { 'x-action-source': 'assistant' });
    expect(p.status, JSON.stringify(p.body)).toBe(202);
    expect(p.body.data.preview.changes[0]).toMatchObject({
      entity: 'credit_wallet',
      before: { low_alert: true },
      after: { low_alert: false },
    });
    const sales = authzForRole('sales', uuidv7());
    expect(sales.permissions.has('billing.manage' as never)).toBe(false);
  });
});

describe('AC05 hết Credit → hội thoại auto sang người', () => {
  it('chỉ auto đang rảnh / chạy sang người; copilot / tắt / đã có người / đóng không đụng; chạy lại không chuyển đôi', async () => {
    const auto1 = await conv();
    const auto2 = await conv({ aiState: 'running' });
    const copilot = await conv({ aiMode: 'copilot' });
    const offAi = await conv({ aiMode: 'off' });
    const human = await conv({ aiState: 'handoff' });
    const waiting = await conv({ aiState: 'waiting_approval' });
    const closed = await conv({ status: 'closed' });
    await drain();
    expect(await handoffForCredit(deps(), db, h.ws)).toBeGreaterThanOrEqual(2);
    for (const id of [auto1, auto2])
      expect(await state(id)).toMatchObject({
        aiMode: 'auto',
        aiState: 'handoff',
        handoffReason: expect.stringMatching(/credit/i),
      });
    expect(await state(copilot)).toMatchObject({ aiState: 'idle' });
    expect(await state(offAi)).toMatchObject({ aiState: 'idle' });
    expect(await state(waiting)).toMatchObject({ aiState: 'waiting_approval' });
    expect(await state(closed)).toMatchObject({ aiState: 'idle' });
    expect((await state(human)).handoffReason).toBeNull();
    const ev = await db.outboxEvent.findMany({ where: { topic: 'ai.handoff' } });
    expect(
      ev.filter((e) => [auto1, auto2].includes((e.payload as { conversation_id: string }).conversation_id)),
    ).toHaveLength(2);
    // Chạy lại (event trùng) → không chuyển đôi.
    expect(await handoffForCredit(deps(), db, h.ws)).toBe(0);
    expect(await db.outboxEvent.count({ where: { topic: 'ai.handoff' } })).toBe(ev.length);
  });

  it('event trễ sau khi nạp (ví > 0) → không chuyển; restored không tự giành lại', async () => {
    const before = await conv();
    await drain();
    expect(await handoffForCredit(deps(), db, h.ws)).toBeGreaterThanOrEqual(1);
    await wallet().topup(h.ws, 500, { refType: 'test', refId: uuidv7() });
    const after = await conv();
    expect(await handoffForCredit(deps(), db, h.ws)).toBe(0);
    expect(await state(after)).toMatchObject({ aiState: 'idle' });
    expect(await state(before)).toMatchObject({ aiState: 'handoff' });
  });

  it('qua outbox thật: charge hết → event credits.exhausted ghi outbox tenant (consumer bền nhận ở ROLE=jobs)', async () => {
    await wallet().topup(h.ws, 50, { refType: 'test', refId: uuidv7() });
    const n0 = await db.outboxEvent.count({ where: { topic: 'credits.exhausted' } });
    await drain();
    await expect
      .poll(async () => db.outboxEvent.count({ where: { topic: 'credits.exhausted' } }), { timeout: 5000 })
      .toBe(n0 + 1);
  });
});
