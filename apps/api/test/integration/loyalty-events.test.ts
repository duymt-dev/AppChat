// TIP-036 P2 — sổ điểm theo sự kiện trên Postgres 16 thật (executor thật nguồn system): hoàn tất → earn đúng một lần (event lặp 10 lần →
// 1 bút toán), căn cứ snapshot theo thực thu (DC-297 c), hệ số cấu hình đổi chỉ ảnh hưởng đơn sau; hoàn tác hoàn tất → đảo (sổ ghi bù),
// hoàn tất lại → lượt mới không bị chặn, không nhân; huỷ → đảo + trả điểm đã dùng (đúng lô); hoàn tiền đã duyệt hai lần một phần → đảo
// luỹ kế ≤ điểm gốc; đảo khi điểm đã tiêu → nợ, chặn đổi (DC-297 a); hết hạn FIFO + xét hạng đầu quý một lần; HTTP không gọi được
// action hệ thống. Bất biến: Σ lô còn − nợ = contact.points_balance.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ActionExecutor, loyaltyOrdersConsumer, loyaltyPaymentsConsumer, reviewTiers, expireLoyalty, uuidv7, type DomainEvent } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let serum: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const executor = () => h.app.get(ActionExecutor, { strict: false });

/** Chạy consumer loyalty trên event outbox mới nhất của đơn (topic) — như queue `events` giao. */
async function deliver(topic: string, orderId: string, times = 1) {
  const db = await tenant();
  const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic, payload: { path: ['order_id'], equals: orderId } }, orderBy: { createdAt: 'desc' } });
  const c = topic === 'payment.refunded' ? loyaltyPaymentsConsumer(executor()) : loyaltyOrdersConsumer(executor());
  const e: DomainEvent = { id: ev.id, topic, workspaceId: h.ws, payload: ev.payload as Record<string, unknown>, traceId: null };
  for (let k = 0; k < times; k++) await c.handle(e, db);
}

async function member(id: string) {
  const db = await tenant();
  const c = await db.contact.findUniqueOrThrow({ where: { id }, select: { pointsBalance: true, tierKey: true } });
  const lots = await db.loyaltyLedger.aggregate({ where: { contactId: id, remaining: { gt: 0 } }, _sum: { remaining: true } });
  const debt = c.pointsBalance < 0n ? -c.pointsBalance : 0n;
  return { balance: Number(c.pointsBalance), tier: c.tierKey, invariant: (lots._sum.remaining ?? 0n) - debt === c.pointsBalance };
}

async function paidOrder(contact: string, price: string, qty = 1) {
  const o = await ok('order.create', { contact_id: contact, items: [{ product_id: serum, name: 'Serum', qty, unit_price: price, tax_rate: 0 }] });
  await ok('order.confirm', { order_id: o.result.order_id });
  const total = String(BigInt(price) * BigInt(qty));
  const inv = await ok('invoice.create', { order_id: o.result.order_id, contact_id: contact, kind: 'full', amount: total });
  return { order: o.result.order_id as string, invoice: inv.result.invoice_id as string, total };
}
const pay = (invoice: string, amount: string) => ok('invoice.record_payment', { invoice_id: invoice, amount, method: 'cash' });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  serum = (await ok('product.create', { name: 'Serum điểm', type: 'service', price: '100000' })).result.product_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('earn khi hoàn tất', () => {
  it('AC2 Vàng 19.999đ → 1 điểm, 20.000đ → 3; event lặp 10 lần → 1 bút toán; hệ số đổi chỉ ảnh hưởng đơn sau', async () => {
    const lan = (await ok('contact.create', { full_name: 'Chị Vàng', phone: '0909361001' })).result.contact_id;
    const db = await tenant();
    await db.contact.update({ where: { id: lan }, data: { tierKey: 'gold' } });
    const a = await paidOrder(lan, '19999');
    await pay(a.invoice, a.total);
    expect((await ok('order.complete', { order_id: a.order })).result.points).toBe(1);
    await deliver('order.completed', a.order, 10);
    expect(await db.loyaltyLedger.count({ where: { contactId: lan, kind: 'earn' } })).toBe(1);
    const earn = await db.loyaltyLedger.findFirstOrThrow({ where: { contactId: lan, kind: 'earn' } });
    expect(earn.basis).toMatchObject({ net_before_vat: '19999', earn_net: '19999', tier: 'gold', mult: 1.5, enabled: true });
    const b = await paidOrder(lan, '20000');
    await pay(b.invoice, b.total);
    expect((await ok('order.complete', { order_id: b.order })).result.points).toBe(3);
    await deliver('order.completed', b.order);
    expect(await member(lan)).toMatchObject({ balance: 4, invariant: true });
    // Cấu hình đổi sau khi hoàn tất: bút toán cũ giữ căn cứ snapshot.
    await ok('loyalty.update_config', { tiers: [{ key: 'member', mult: 1 }, { key: 'silver', mult: 1 }, { key: 'gold', mult: 3 }, { key: 'diamond', mult: 2 }] });
    await deliver('order.completed', b.order);
    expect((await db.loyaltyLedger.findFirstOrThrow({ where: { refId: b.order, kind: 'earn' } })).delta).toBe(3n);
    const c = await paidOrder(lan, '20000');
    await pay(c.invoice, c.total);
    expect((await ok('order.complete', { order_id: c.order })).result.points).toBe(6);
    await ok('loyalty.update_config', { tiers: [{ key: 'member', mult: 1 }, { key: 'silver', mult: 1 }, { key: 'gold', mult: 1.5 }, { key: 'diamond', mult: 2 }] });
  });

  it('DC-297 c: chưa thu đủ → tích theo thực thu lúc hoàn tất, thu thêm sau không tích lần hai; chưa thu → 0', async () => {
    const id = (await ok('contact.create', { full_name: 'Anh Thu Nửa', phone: '0909361002' })).result.contact_id;
    const a = await paidOrder(id, '1000000');
    await pay(a.invoice, '500000');
    expect((await ok('order.complete', { order_id: a.order })).result.points).toBe(50);
    await deliver('order.completed', a.order);
    await pay(a.invoice, '500000');
    await deliver('order.completed', a.order);
    expect(await member(id)).toMatchObject({ balance: 50, invariant: true });
    const z = await paidOrder(id, '300000');
    expect((await ok('order.complete', { order_id: z.order })).result.points).toBe(0);
    await deliver('order.completed', z.order);
    expect(await (await tenant()).loyaltyLedger.count({ where: { refId: z.order } })).toBe(0);
  });
});

describe('hoàn tác / huỷ / hoàn tiền', () => {
  it('AC4 hoàn tác hoàn tất → đảo (ghi bù); event cũ đến sau không cộng lại; hoàn tất lại → lượt mới đúng một lần', async () => {
    const id = (await ok('contact.create', { full_name: 'Chị Hoàn Tác', phone: '0909361003' })).result.contact_id;
    const a = await paidOrder(id, '500000');
    await pay(a.invoice, a.total);
    const done = await ok('order.complete', { order_id: a.order });
    await deliver('order.completed', a.order);
    expect((await member(id)).balance).toBe(50);
    expect((await undo(done.action_log_id)).status).toBe(200);
    expect(await member(id)).toMatchObject({ balance: 0, invariant: true });
    await deliver('order.completed', a.order, 3);
    expect((await member(id)).balance).toBe(0);
    await ok('order.complete', { order_id: a.order });
    await deliver('order.completed', a.order, 3);
    const db = await tenant();
    expect(await member(id)).toMatchObject({ balance: 50, invariant: true });
    expect(await db.loyaltyLedger.count({ where: { refId: a.order, kind: 'earn' } })).toBe(2);
    expect(await db.loyaltyLedger.count({ where: { refId: a.order, kind: 'reverse' } })).toBe(1);
  });

  it('hoàn tác hoàn tất trước khi consumer chạy → event đến sau bỏ qua (không cộng)', async () => {
    const id = (await ok('contact.create', { full_name: 'Anh Chưa Cộng', phone: '0909361004' })).result.contact_id;
    const a = await paidOrder(id, '200000');
    await pay(a.invoice, a.total);
    const done = await ok('order.complete', { order_id: a.order });
    expect((await undo(done.action_log_id)).status).toBe(200);
    await deliver('order.completed', a.order);
    expect((await member(id)).balance).toBe(0);
  });

  it('hoàn tiền đã duyệt hai lần một phần → đảo luỹ kế, không vượt điểm gốc; yêu cầu chờ không đảo', async () => {
    const id = (await ok('contact.create', { full_name: 'Chị Hoàn Tiền', phone: '0909361005' })).result.contact_id;
    const a = await paidOrder(id, '1010000');
    await pay(a.invoice, a.total);
    await ok('order.complete', { order_id: a.order });
    await deliver('order.completed', a.order);
    expect((await member(id)).balance).toBe(101);
    const r1 = await ok('payment.refund', { invoice_id: a.invoice, amount: '303000', reason: 'Hoàn một phần' });
    expect((await member(id)).balance).toBe(101);
    await ok('payment.refund_approve', { payment_id: r1.result.payment_id });
    await deliver('payment.refunded', a.order, 3);
    expect(await member(id)).toMatchObject({ balance: 71, invariant: true });
    const r2 = await ok('payment.refund', { invoice_id: a.invoice, amount: '707000', reason: 'Hoàn nốt' });
    await ok('payment.refund_approve', { payment_id: r2.result.payment_id });
    await deliver('payment.refunded', a.order, 2);
    const db = await tenant();
    const rev = await db.loyaltyLedger.aggregate({ where: { refId: a.order, kind: 'reverse' }, _sum: { delta: true } });
    expect(rev._sum.delta).toBe(-101n);
    expect(await member(id)).toMatchObject({ balance: 0, invariant: true });
  });

  it('DC-297 a: đảo khi điểm đã tiêu → số dư âm (nợ), đổi điểm bị chặn; cộng sau trả nợ trước', async () => {
    const id = (await ok('contact.create', { full_name: 'Anh Nợ Điểm', phone: '0909361006' })).result.contact_id;
    const a = await paidOrder(id, '1000000');
    await pay(a.invoice, a.total);
    await ok('order.complete', { order_id: a.order });
    await deliver('order.completed', a.order);
    const b = await paidOrder(id, '200000');
    await ok('payment.redeem_points', { invoice_id: b.invoice, points: 80 });
    expect((await member(id)).balance).toBe(20);
    const r = await ok('payment.refund', { invoice_id: a.invoice, amount: '1000000', reason: 'Hoàn đủ' });
    await ok('payment.refund_approve', { payment_id: r.result.payment_id });
    await deliver('payment.refunded', a.order);
    expect(await member(id)).toMatchObject({ balance: -80, invariant: true });
    const c = await paidOrder(id, '100000');
    expect((await act('payment.redeem_points', { invoice_id: c.invoice, points: 1 })).body.error.fields).toMatchObject({ points: 'insufficient' });
    await ok('loyalty.adjust_points', { contact_id: id, delta: 100, reason: 'promotion' });
    expect(await member(id)).toMatchObject({ balance: 20, invariant: true });
    const lot = await (await tenant()).loyaltyLedger.findFirstOrThrow({ where: { contactId: id, kind: 'adjust' } });
    expect(lot.remaining).toBe(20n);
  });

  it('huỷ đơn: trả lại điểm đã dùng đúng lô (giữ hạn gốc); không hoàn điểm thành tiền', async () => {
    const id = (await ok('contact.create', { full_name: 'Chị Huỷ Đơn', phone: '0909361007' })).result.contact_id;
    await ok('loyalty.adjust_points', { contact_id: id, delta: 300, reason: 'promotion' });
    const a = await paidOrder(id, '400000');
    const r = await ok('payment.redeem_points', { invoice_id: a.invoice, points: 200 });
    expect(r.result).toMatchObject({ points: 200, amount: '20000', balance_after: 100 });
    await pay(a.invoice, '380000');
    const db = await tenant();
    const lot = await db.loyaltyLedger.findFirstOrThrow({ where: { contactId: id, kind: 'adjust' } });
    expect(lot.remaining).toBe(100n);
    await ok('order.cancel', { order_id: a.order, reason: 'Khách đổi ý' });
    const refund = await db.customerPayment.findFirstOrThrow({ where: { orderId: a.order, kind: 'refund' } });
    expect(refund.amount).toBe(-380000n);
    await deliver('order.cancelled', a.order, 3);
    expect(await member(id)).toMatchObject({ balance: 300, invariant: true });
    expect((await db.loyaltyLedger.findUniqueOrThrow({ where: { id: lot.id } })).remaining).toBe(300n);
  });
});

describe('job hết hạn + xét hạng', () => {
  it('AC5 lô quá 12 tháng hết hạn FIFO đúng một lần; xét hạng đầu quý theo điểm tích 12 tháng, chạy lại không đổi', async () => {
    const id = (await ok('contact.create', { full_name: 'Anh Hết Hạn', phone: '0909361008' })).result.contact_id;
    await ok('loyalty.adjust_points', { contact_id: id, delta: 6000, reason: 'promotion' });
    h.clock.advance(40 * 86_400_000);
    await ok('loyalty.adjust_points', { contact_id: id, delta: 500, reason: 'promotion' });
    const db = await tenant();
    const d = { executor: executor(), now: () => h.clock.now() };
    // Sang quý 2027-01: cửa sổ 2026-01-01 → 2027-01-01 (giờ VN) gồm 6.500 điểm tích → Bạc; chạy lại cùng quý không xét lại.
    h.clock.advance(30 * 86_400_000);
    expect(await reviewTiers(db, h.ws, 'Asia/Ho_Chi_Minh', d)).toBeGreaterThan(0);
    expect((await member(id)).tier).toBe('silver');
    expect(await reviewTiers(db, h.ws, 'Asia/Ho_Chi_Minh', d)).toBe(0);
    // 2027-11: lô 6.000 (cộng 2026-10-30) quá 12 tháng, lô 500 (2026-12-09) còn hạn.
    h.clock.advance(300 * 86_400_000);
    expect(await expireLoyalty(db, h.ws, d)).toBeGreaterThan(0);
    expect(await expireLoyalty(db, h.ws, d)).toBe(0);
    expect(await member(id)).toMatchObject({ balance: 500, invariant: true });
    expect(await db.loyaltyLedger.count({ where: { contactId: id, kind: 'expire' } })).toBe(1);
  });

  it('HTTP không gọi được action hệ thống (403 ui / 422 header system)', async () => {
    const o = uuidv7();
    expect((await act('loyalty.earn', { order_id: o, completion_id: o, basis: {} })).status).toBe(403);
    const sys = await call(h, '/actions/loyalty.expire', { input: { contact_id: o } }, { 'idempotency-key': uuidv7(), 'x-action-source': 'system' }).then(json);
    expect(sys.status).toBe(422);
  });
});
