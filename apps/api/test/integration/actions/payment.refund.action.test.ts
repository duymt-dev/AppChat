// Ma trận payment.refund (TIP-023b): yêu cầu hoàn (risk money) → khoản hoàn pending + cảnh báo cần duyệt; vượt còn hoàn được → 422, đề nghị lẫn
// liệu trình → 422 ở preview. 403 cs (không có payment.refund_request). Undo: ActionDef không khai (tiền đi ra).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };

beforeAll(async () => {
  m = await matrix('payment.refund');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
  await m.seed('invoice.record_payment', { invoice_id: inv.invoice_id, amount: '500000', method: 'cash' });
}, 120_000);
afterAll(() => m?.close());

describe('payment.refund', () => {
  it('403 cs · vượt còn hoàn được → 422 · thiếu nguồn → 422', async () => {
    expect((await m.act({ invoice_id: inv.invoice_id, reason: 'x' }, m.cs)).status).toBe(403);
    expect((await m.act({ invoice_id: inv.invoice_id, amount: '500001', reason: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ amount: 'over_refundable' });
    expect((await m.act({ reason: 'x' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận (mặc định toàn bộ đã thu)', async () => {
    const { preview, done } = await m.confirm({ invoice_id: inv.invoice_id, reason: ' Khách đổi ý ' });
    expect(preview).toEqual({
      summary: `Chị Lan TT · 500.000₫ · ${inv.code}`,
      risk: 'money',
      changes: [{ entity: 'payment', after: { kind: 'refund', status: 'pending', amount: '500000', method: 'cash', reason: 'Khách đổi ý' } }],
      warnings: ['needs_approval'],
    });
    expect(done.body.data.result).toMatchObject({ status: 'pending', amount: '500000' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
