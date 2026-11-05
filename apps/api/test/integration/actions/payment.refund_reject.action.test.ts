// Ma trận payment.refund_reject (TIP-023b): từ chối hoàn tiền → khách + số tiền + đề nghị + ghi chú; đã xử lý → 409 ở preview.
// 403 sales (không có payment.refund_approve) · id lạ 404. Không hoàn tác (ActionDef không khai undo).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };
let refund: string;

beforeAll(async () => {
  m = await matrix('payment.refund_reject');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
  await m.seed('invoice.record_payment', { invoice_id: inv.invoice_id, amount: '500000', method: 'cash' });
  refund = (await m.seed('payment.refund', { invoice_id: inv.invoice_id, amount: '200000', reason: 'Khách đổi ý' })).payment_id;
}, 120_000);
afterAll(() => m?.close());

describe('payment.refund_reject', () => {
  it('403 sales · id lạ 404', async () => {
    expect((await m.act({ payment_id: refund, note: 'x' }, m.sales)).status).toBe(403);
    expect((await m.act({ payment_id: '0190f000-0000-7000-8000-00000000beef', note: 'x' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; lần hai → 409', async () => {
    const { preview, done } = await m.confirm({ payment_id: refund, note: ' Không đủ điều kiện ' });
    expect(preview).toEqual({ summary: `Chị Lan TT · 200.000₫ · ${inv.code}`, risk: 'write', changes: [{ entity: 'payment', id: refund, before: { status: 'pending', note: null }, after: { status: 'failed', note: 'Không đủ điều kiện' } }] });
    expect(done.body.data.result.status).toBe('failed');
    expect((await m.act({ payment_id: refund, note: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_STATE');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
