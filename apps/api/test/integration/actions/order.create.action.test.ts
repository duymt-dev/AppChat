// Ma trận order.create (TIP-023b): tạo đơn → khách + người phụ trách (theo tên) + số dòng + tổng + cọc; cọc vượt tổng → 422 ở preview;
// undo xoá đơn. 403 cs (không có order.manage) · sales: khách của owner → 404 · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;

beforeAll(async () => {
  m = await matrix('order.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.create', () => {
  it('403 cs · sales: khách ngoài scope → 404 · cọc vượt tổng → 422', async () => {
    const inp = { contact_id: lan, items: [{ name: 'Phí', qty: 1, unit_price: '1000', tax_rate: 0 }] };
    expect((await m.act(inp, m.cs)).status).toBe(403);
    expect((await m.act(inp, m.sales)).status).toBe(404);
    expect((await m.act({ ...inp, deposit_amount: '5000' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ deposit_amount: 'over_total' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 1, unit_price: '600000', tax_rate: 10 }], deposit_amount: '200000' });
    expect(preview).toEqual({ summary: 'Chị Lan ĐH · 660.000₫', risk: 'write', changes: [{ entity: 'order', after: { contact: 'Chị Lan ĐH', owner: 'Chủ Spa', source: 'manual', items: 1, total: '660000', deposit: '200000' } }] });
    const id = done.body.data.result.order_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).order.count({ where: { id } })).toBe(0);
  });

  it('idempotency', async () => {
    const inp = { contact_id: lan, items: [{ name: 'Phí', qty: 1, unit_price: '1000', tax_rate: 0 }] };
    const a = await m.actWithKey('dh-create-idem', inp);
    expect((await m.actWithKey('dh-create-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
