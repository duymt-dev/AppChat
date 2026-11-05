// Ma trận category.list (TIP-032b): danh mục + id + màu + số sản phẩm (đường tra `category_id` cho Trợ lý); risk read; 403 không có
// catalog.view thì không áp dụng — mọi vai trò có catalog.view (sales / cs xem được).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('category.list');
  await m.seed('category.create', { name: 'Trống' });
  await m.seed('product.create', { name: 'Serum', type: 'physical', price: '100000', category: 'Chăm sóc da' });
}, 120_000);
afterAll(() => m?.close());

describe('category.list', () => {
  it('Owner + Sales đọc được: id + số sản phẩm', async () => {
    for (const who of [undefined, m.sales]) {
      const r = await m.act({}, who);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      const items = r.body.data.result.items as { category_id: string; name: string; product_count: number }[];
      expect(items.find((c) => c.name === 'Chăm sóc da')).toMatchObject({ product_count: 1 });
      expect(items.find((c) => c.name === 'Trống')).toMatchObject({ product_count: 0 });
      expect(items.every((c) => /^[0-9a-f-]{36}$/.test(c.category_id))).toBe(true);
    }
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
