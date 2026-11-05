// TIP-036 P2 — đổi điểm / hết hạn cạnh tranh trên Postgres 16 thật (khoá đề nghị → đơn → khách → lô): AC3 đơn 100.000đ + 1.000 điểm →
// đổi 500 = 50.000đ, 501 chặn; hai đề nghị của cùng đơn gửi đồng thời không né trần 50%; thiếu điểm / quá công nợ → rollback toàn bộ
// (không khoản thu, không bút toán). AC5 hai đơn tiêu cùng số dư đồng thời không tiêu hai lần; đổi điểm đua với hết hạn lấy FIFO đúng lô.
// Hoàn tác đổi điểm: khoản thu → failed (không xoá), điểm về đúng lô.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ActionExecutor, expireLoyalty, uuidv7 } from '@appchat/core';
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
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

async function balanceOf(id: string) {
  const db = await tenant();
  const c = await db.contact.findUniqueOrThrow({ where: { id }, select: { pointsBalance: true } });
  const lots = await db.loyaltyLedger.aggregate({ where: { contactId: id, remaining: { gt: 0 } }, _sum: { remaining: true } });
  expect(lots._sum.remaining ?? 0n).toBe(c.pointsBalance);
  return Number(c.pointsBalance);
}

async function orderOf(contact: string, total: string, invoices: string[]) {
  const o = await ok('order.create', { contact_id: contact, items: [{ product_id: serum, name: 'Serum', qty: 1, unit_price: total, tax_rate: 0 }] });
  await ok('order.confirm', { order_id: o.result.order_id });
  const ids: string[] = [];
  for (const amount of invoices) ids.push((await ok('invoice.create', { order_id: o.result.order_id, contact_id: contact, kind: 'installment', amount })).result.invoice_id);
  return { order: o.result.order_id as string, invoices: ids };
}

async function customer(name: string, phone: string, points: number) {
  const id = (await ok('contact.create', { full_name: name, phone })).result.contact_id as string;
  if (points) await ok('loyalty.adjust_points', { contact_id: id, delta: points, reason: 'promotion' });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  serum = (await ok('product.create', { name: 'Dịch vụ điểm', type: 'service', price: '100000' })).result.product_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('payment.redeem_points', () => {
  it('AC3 đơn 100.000đ + 1.000 điểm: 501 chặn (trần 50%), 500 → 50.000đ khoản thu points + phiếu thu; đơn ghi điểm đã dùng', async () => {
    const lan = await customer('Chị Lan Đổi', '0909362001', 1000);
    const { order, invoices } = await orderOf(lan, '100000', ['100000']);
    const over = await act('payment.redeem_points', { invoice_id: invoices[0], points: 501 });
    expect(over.status).toBe(422);
    expect(over.body.error.fields).toMatchObject({ points: 'over_cap', max: '500' });
    const r = await ok('payment.redeem_points', { invoice_id: invoices[0], points: 500 });
    expect(r.result).toMatchObject({ order_id: order, points: 500, amount: '50000', balance_after: 500 });
    const db = await tenant();
    const pay = await db.customerPayment.findUniqueOrThrow({ where: { id: r.result.payment_id } });
    expect(pay).toMatchObject({ kind: 'points', method: 'points', amount: 50000n, status: 'confirmed' });
    expect(pay.receiptCode).toMatch(/^PT-/);
    expect(await db.order.findUniqueOrThrow({ where: { id: order } })).toMatchObject({ pointsUsed: 500n, paidTotal: 50000n });
    expect(await db.invoice.findUniqueOrThrow({ where: { id: invoices[0] } })).toMatchObject({ paidAmount: 50000n, status: 'partial' });
    expect(await balanceOf(lan)).toBe(500);
    expect((await act('payment.redeem_points', { invoice_id: invoices[0], points: 1 })).body.error.fields).toMatchObject({ points: 'over_cap' });
  });

  it('hai đề nghị của cùng đơn gửi đồng thời: tổng ≤ 500 (một bị chặn), số dư / lô khớp', async () => {
    const id = await customer('Anh Hai Đề Nghị', '0909362002', 1000);
    const { order, invoices } = await orderOf(id, '100000', ['50000', '50000']);
    const rs = await Promise.all(invoices.map((inv) => act('payment.redeem_points', { invoice_id: inv, points: 300 })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 422]);
    expect((await (await tenant()).order.findUniqueOrThrow({ where: { id: order } })).pointsUsed).toBe(300n);
    expect(await balanceOf(id)).toBe(700);
  });

  it('thiếu điểm / quá công nợ → rollback toàn bộ (không khoản thu, không bút toán)', async () => {
    const id = await customer('Chị Thiếu Điểm', '0909362003', 100);
    const { invoices } = await orderOf(id, '1000000', ['10000']);
    const db = await tenant();
    const before = await db.loyaltyLedger.count({ where: { contactId: id } });
    expect((await act('payment.redeem_points', { invoice_id: invoices[0], points: 101 })).body.error.fields).toMatchObject({ points: 'over_due' });
    expect((await act('payment.redeem_points', { invoice_id: invoices[0], points: 100 })).status).toBe(200);
    const { invoices: more } = await orderOf(id, '1000000', ['1000000']);
    expect((await act('payment.redeem_points', { invoice_id: more[0], points: 1 })).body.error.fields).toMatchObject({ points: 'insufficient' });
    expect(await db.loyaltyLedger.count({ where: { contactId: id } })).toBe(before + 1);
    expect(await db.customerPayment.count({ where: { invoiceId: more[0] } })).toBe(0);
  });

  it('AC5 hai đơn tiêu cùng 500 điểm đồng thời → một thành công, không tiêu hai lần', async () => {
    const id = await customer('Anh Song Song', '0909362004', 500);
    const a = await orderOf(id, '1000000', ['1000000']);
    const b = await orderOf(id, '1000000', ['1000000']);
    const rs = await Promise.all([a, b].map((o) => act('payment.redeem_points', { invoice_id: o.invoices[0], points: 400 })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 422]);
    expect(await balanceOf(id)).toBe(100);
  });

  it('hoàn tác đổi điểm: khoản thu → failed (không xoá), đề nghị / đơn trừ lại, điểm về đúng lô', async () => {
    const id = await customer('Chị Hoàn Tác Đổi', '0909362005', 400);
    const { order, invoices } = await orderOf(id, '200000', ['200000']);
    const r = await ok('payment.redeem_points', { invoice_id: invoices[0], points: 300 });
    const u = await call(h, `/action-logs/${r.action_log_id}/undo`, {}).then(json);
    expect(u.status).toBe(200);
    const db = await tenant();
    expect((await db.customerPayment.findUniqueOrThrow({ where: { id: r.result.payment_id } })).status).toBe('failed');
    expect(await db.order.findUniqueOrThrow({ where: { id: order } })).toMatchObject({ pointsUsed: 0n, paidTotal: 0n });
    expect(await db.invoice.findUniqueOrThrow({ where: { id: invoices[0] } })).toMatchObject({ paidAmount: 0n });
    expect(await balanceOf(id)).toBe(400);
    expect((await db.loyaltyLedger.findFirstOrThrow({ where: { contactId: id, kind: 'adjust' } })).remaining).toBe(400n);
  });
});

describe('FIFO + hết hạn cạnh tranh', () => {
  it('lô hạn sớm dùng trước; đổi điểm đua với hết hạn → không âm, không tiêu lô đã hết hạn, tổng khớp', async () => {
    const id = await customer('Anh FIFO', '0909362006', 300);
    h.clock.advance(60 * 86_400_000);
    await ok('loyalty.adjust_points', { contact_id: id, delta: 300, reason: 'promotion' });
    const db = await tenant();
    const [old, young] = await db.loyaltyLedger.findMany({ where: { contactId: id, kind: 'adjust' }, orderBy: { createdAt: 'asc' } });
    const a = await orderOf(id, '1000000', ['1000000']);
    await ok('payment.redeem_points', { invoice_id: a.invoices[0], points: 100 });
    expect((await db.loyaltyLedger.findUniqueOrThrow({ where: { id: old!.id } })).remaining).toBe(200n);
    // Qua hạn lô đầu (12 tháng sau lần cộng), lô sau còn hạn: đổi + quét hạn cùng lúc.
    h.clock.advance(310 * 86_400_000);
    const exec = h.app.get(ActionExecutor, { strict: false });
    const [redeem] = await Promise.all([
      act('payment.redeem_points', { invoice_id: a.invoices[0], points: 250 }),
      expireLoyalty(db, h.ws, { executor: exec, now: () => h.clock.now() }),
    ]);
    expect(redeem.status).toBe(200);
    expect((await db.loyaltyLedger.findUniqueOrThrow({ where: { id: old!.id } })).remaining).toBe(0n);
    expect((await db.loyaltyLedger.findUniqueOrThrow({ where: { id: young!.id } })).remaining).toBe(50n);
    expect(await balanceOf(id)).toBe(50);
    const allocs = await db.loyaltyAlloc.findMany({ where: { lotId: old!.id } });
    expect(allocs.reduce((s, x) => s + x.points, 0n)).toBe(300n);
  });
});
