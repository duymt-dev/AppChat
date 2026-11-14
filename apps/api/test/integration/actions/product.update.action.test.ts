// Ma trận product.update (TIP-023b): sửa sản phẩm → trước / sau chỉ trường đổi; if_version lệch → 409 STALE_VERSION ở preview; undo trả ảnh
// chụp cũ. 403 sales · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: { product_id: string; code: string };

beforeAll(async () => {
  m = await matrix('product.update');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  p = await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, sku: 'SR-B5', stock: 5, low_stock_threshold: 2 });
}, 120_000);
afterAll(() => m?.close());

describe('product.update', () => {
  it('403 sales · id lạ 404 · version lệch → 409', async () => {
    expect((await m.act({ product_id: p.product_id, patch: { price: '1' } }, m.sales)).status).toBe(403);
    expect((await m.act({ product_id: '0190f000-0000-7000-8000-00000000beef', patch: { price: '1' } })).status).toBe(404);
    expect((await m.act({ product_id: p.product_id, if_version: 99, patch: { price: '1' } }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('STALE_VERSION');
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ product_id: p.product_id, patch: { price: '650000', name: 'Serum B5' } });
    expect(preview).toEqual({ summary: 'SR-B5 · Serum B5', risk: 'write', changes: [{ entity: 'product', id: p.product_id, before: { price: '600000' }, after: { price: '650000' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).product.findUniqueOrThrow({ where: { id: p.product_id } })).price).toBe(600000n);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
