// Ma trận invoice.create (TIP-023b): đề nghị thanh toán → khách + đơn + loại + số tiền + hạn (+7 ngày); vượt còn phải thu của đơn → 422 ở preview;
// undo xoá nháp. 403 cs (không có invoice.manage) · sales: đơn của owner → 404 · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };

beforeAll(async () => {
  m = await matrix('invoice.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
}, 120_000);
afterAll(() => m?.close());

describe('invoice.create', () => {
  it('403 cs · sales: đơn ngoài scope → 404 · vượt còn phải thu → 422', async () => {
    const inp = { order_id: o.order_id, contact_id: lan, kind: 'deposit', amount: '500000' };
    expect((await m.act(inp, m.cs)).status).toBe(403);
    expect((await m.act(inp, m.sales)).status).toBe(404);
    expect((await m.act({ ...inp, amount: '2000001' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ amount: 'invoice.amount_over' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ order_id: o.order_id, contact_id: lan, kind: 'deposit', amount: '500000', due_date: '2099-12-31' });
    expect(preview).toEqual({ summary: 'Chị Lan TT · 500.000₫', risk: 'write', changes: [{ entity: 'invoice', after: { contact: 'Chị Lan TT', order: o.code, kind: 'deposit', amount: '500000', due_date: '2099-12-31' } }] });
    const id = done.body.data.result.invoice_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).invoice.count({ where: { id } })).toBe(0);
  });

  it('idempotency', async () => {
    const inp = { contact_id: lan, kind: 'full', amount: '1000' };
    const a = await m.actWithKey('tt-create-idem', inp);
    expect((await m.actWithKey('tt-create-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
