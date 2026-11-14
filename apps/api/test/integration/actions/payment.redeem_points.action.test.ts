// Ma trận payment.redeem_points (TIP-036, risk money, undo 24h, agent ✗): preview Trợ lý có số dư trước / sau + đã thu đề nghị → xác nhận
// → hoàn tác (khoản thu failed, điểm về lô); CS / sales (không payment.record — Kế toán có, scope sales all) 403 · id lạ 404;
// idempotency cùng khoá → một khoản thu; trạng thái: đề nghị đã huỷ → 409. Luồng đủ + cạnh tranh: loyalty-concurrency.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let inv: string;

beforeAll(async () => {
  m = await matrix('payment.redeem_points');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Đổi Điểm', phone: '0909364001' })).contact_id;
  await m.seed('loyalty.adjust_points', { contact_id: lan, delta: 1000, reason: 'promotion' });
  const p = (await m.seed('product.create', { name: 'Gói chăm sóc', type: 'service', price: '400000' })).product_id;
  const o = (await m.seed('order.create', { contact_id: lan, items: [{ product_id: p, name: 'Gói chăm sóc', qty: 1, unit_price: '400000', tax_rate: 0 }] })).order_id;
  await m.seed('order.confirm', { order_id: o });
  inv = (await m.seed('invoice.create', { order_id: o, contact_id: lan, kind: 'full', amount: '400000' })).invoice_id;
}, 120_000);
afterAll(() => m?.close());

describe('payment.redeem_points', () => {
  it('preview Trợ lý → xác nhận → hoàn tác', async () => {
    const { preview, done } = await m.confirm({ invoice_id: inv, points: 300 });
    expect(preview).toMatchObject({ risk: 'money', changes: [{ entity: 'loyalty_member', id: lan, before: { points: 1000 }, after: { points: 700 } }, { entity: 'invoice', id: inv, before: { paid: '0' }, after: { paid: '30000', method: 'points' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: lan } })).pointsBalance).toBe(1000n);
  });

  it('403 thiếu quyền (CS, sales) · id lạ → 404', async () => {
    expect((await m.act({ invoice_id: inv, points: 10 }, m.cs)).status).toBe(403);
    expect((await m.act({ invoice_id: inv, points: 10 }, m.sales)).status).toBe(403);
    expect((await m.act({ invoice_id: '0190f000-0000-7000-8000-00000000beef', points: 10 })).status).toBe(404);
  });

  it('idempotency cùng khoá → một khoản thu points', async () => {
    const a = await m.actWithKey('redeem-same-key-1', { invoice_id: inv, points: 50 });
    const b = await m.actWithKey('redeem-same-key-1', { invoice_id: inv, points: 50 });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(b.body.data.result.payment_id).toBe(a.body.data.result.payment_id);
    expect(await (await m.db()).customerPayment.count({ where: { invoiceId: inv, kind: 'points', status: 'confirmed' } })).toBe(1);
  });

  it('trạng thái: đề nghị đã huỷ → 409', async () => {
    const p = (await m.seed('product.create', { name: 'Gói lẻ', type: 'service', price: '100000' })).product_id;
    const o = (await m.seed('order.create', { contact_id: lan, items: [{ product_id: p, name: 'Gói lẻ', qty: 1, unit_price: '100000', tax_rate: 0 }] })).order_id;
    await m.seed('order.confirm', { order_id: o });
    const other = (await m.seed('invoice.create', { order_id: o, contact_id: lan, kind: 'installment', amount: '10000' })).invoice_id;
    await m.seed('invoice.void', { invoice_id: other, reason: 'Lập nhầm' });
    expect((await m.act({ invoice_id: other, points: 10 })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
