// Ma trận stock.adjust (TIP-023b): điều chỉnh tồn → tồn trước / sau + lý do; dưới ngưỡng / âm → cảnh báo; không phải hàng vật lý → 422 ở
// preview; undo dòng bù. 403 sales (không có stock.adjust) · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: { product_id: string; code: string };

beforeAll(async () => {
  m = await matrix('stock.adjust');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  p = await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, sku: 'SR-B5', stock: 5, low_stock_threshold: 2 });
}, 120_000);
afterAll(() => m?.close());

describe('stock.adjust', () => {
  it('403 sales · id lạ 404 · dịch vụ → 422', async () => {
    expect((await m.act({ product_id: p.product_id, delta: 1, reason: 'x' }, m.sales)).status).toBe(403);
    expect((await m.act({ product_id: '0190f000-0000-7000-8000-00000000beef', delta: 1, reason: 'x' })).status).toBe(404);
    const svc = await m.seed('product.create', { name: 'Tư vấn', type: 'service', price: '0' });
    expect((await m.act({ product_id: svc.product_id, delta: 1, reason: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ product_id: 'not_physical' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ product_id: p.product_id, delta: -4, reason: ' Hỏng ' });
    expect(preview).toEqual({ summary: 'SR-B5 · Serum B5', risk: 'write', changes: [{ entity: 'product', id: p.product_id, before: { stock: 5, reason: null }, after: { stock: 1, reason: 'Hỏng' } }], warnings: ['low_stock'] });
    expect(done.body.data.result).toMatchObject({ stock: 1, low_stock: true });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).product.findUniqueOrThrow({ where: { id: p.product_id } })).stock).toBe(5);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
