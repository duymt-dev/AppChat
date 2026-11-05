// Ma trận product.create (TIP-023b): tạo sản phẩm → tên + loại + giá + mã + danh mục (mới → cảnh báo) + tồn ban đầu; SKU trùng → 409 ở
// preview; undo xoá. 403 sales (không có catalog.manage) · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: { product_id: string; code: string };

beforeAll(async () => {
  m = await matrix('product.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  p = await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, sku: 'SR-B5', stock: 5, low_stock_threshold: 2 });
}, 120_000);
afterAll(() => m?.close());

describe('product.create', () => {
  it('403 sales · SKU trùng → 409', async () => {
    expect((await m.act({ name: 'X', type: 'service', price: '1' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'X', type: 'physical', price: '1', sku: p.code }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ sku: 'duplicate' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ name: ' Mặt nạ ', type: 'physical', price: '100000', category: 'Chăm sóc da', stock: 20 });
    expect(preview).toEqual({ summary: 'Mặt nạ · 100.000₫', risk: 'write', changes: [{ entity: 'product', after: { name: 'Mặt nạ', type: 'physical', price: '100000', category: 'Chăm sóc da', stock: 20 } }], warnings: ['new_category:Chăm sóc da'] });
    const id = done.body.data.result.product_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).product.count({ where: { id } })).toBe(0);
  });

  it('idempotency', async () => {
    const inp = { name: 'Phí đi lại', type: 'service', price: '50000' };
    const a = await m.actWithKey('sp-create-idem', inp);
    expect((await m.actWithKey('sp-create-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
