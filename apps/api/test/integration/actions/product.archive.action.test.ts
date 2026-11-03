// Ma trận product.archive (TIP-023b): lưu trữ (risk delete) → tên + mã + giá; nằm trong combo → cảnh báo; undo khôi phục.
// 403 sales · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: { product_id: string; code: string };

beforeAll(async () => {
  m = await matrix('product.archive');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  p = await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, sku: 'SR-B5', stock: 5, low_stock_threshold: 2 });
}, 120_000);
afterAll(() => m?.close());

describe('product.archive', () => {
  it('403 sales · id lạ 404', async () => {
    expect((await m.act({ product_id: p.product_id }, m.sales)).status).toBe(403);
    expect((await m.act({ product_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý (cảnh báo combo) → xác nhận → undo', async () => {
    await m.seed('product.create', { name: 'Combo dưỡng', type: 'combo', price: '900000', components: [{ name: 'Serum B5', qty: 1 }] });
    const { preview, done } = await m.confirm({ product_id: p.product_id });
    expect(preview).toEqual({ summary: 'SR-B5 · Serum B5', risk: 'delete', changes: [{ entity: 'product', id: p.product_id, before: { name: 'Serum B5', code: 'SR-B5', price: '600000' } }], warnings: ['in_combo:Combo dưỡng'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).product.findUniqueOrThrow({ where: { id: p.product_id } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
