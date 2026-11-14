// Ma trận payment.refund_approve (TIP-023b): duyệt hoàn (risk money) → khách + số tiền + đề nghị, pending → confirmed + phương thức chi; đã
// xử lý → 409 ở preview. 403 sales (không có payment.refund_approve) · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };
let refund: string;

beforeAll(async () => {
  m = await matrix('payment.refund_approve');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
  await m.seed('invoice.record_payment', { invoice_id: inv.invoice_id, amount: '500000', method: 'cash' });
  refund = (await m.seed('payment.refund', { invoice_id: inv.invoice_id, amount: '200000', reason: 'Khách đổi ý' })).payment_id;
}, 120_000);
afterAll(() => m?.close());

describe('payment.refund_approve', () => {
  it('403 sales · id lạ 404', async () => {
    expect((await m.act({ payment_id: refund }, m.sales)).status).toBe(403);
    expect((await m.act({ payment_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; lần hai → 409', async () => {
    const { preview, done } = await m.confirm({ payment_id: refund, note: 'Đã chuyển' });
    expect(preview).toEqual({
      summary: `Chị Lan TT · 200.000₫ · ${inv.code}`,
      risk: 'money',
      changes: [{ entity: 'payment', id: refund, before: { status: 'pending', note: null }, after: { status: 'confirmed', note: 'Đã chuyển' } }],
      warnings: ['pay_out:cash'],
    });
    expect(done.body.data.result).toEqual({ payment_id: refund, status: 'confirmed' });
    expect((await m.act({ payment_id: refund }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_STATE');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
