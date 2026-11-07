// TIP-027: route mock domain catalog đúng shape đọc dùng chung với API thật (packages/shared/src/api/catalog.ts) + hành vi ghi.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  categoriesSchema,
  productActivitySchema,
  productRowSchema,
  productsMetaSchema,
  productsPageSchema,
} from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);

describe('mock catalog — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /products (D42) · /products/:id · /products/meta · /categories · /products/:id/activity', async () => {
    expect(
      issues(productsPageSchema.safeParse(await mockTransport.get('/products', { page: 1, limit: 5 }))),
    ).toEqual([]);
    expect(issues(productRowSchema.safeParse(await mockTransport.get('/products/pd_2')))).toEqual([]);
    expect(issues(productsMetaSchema.safeParse(await mockTransport.get('/products/meta')))).toEqual([]);
    expect(issues(categoriesSchema.safeParse(await mockTransport.get('/categories')))).toEqual([]);
    expect(
      issues(productActivitySchema.safeParse(await mockTransport.get('/products/pd_1/activity'))),
    ).toEqual([]);
  });

  it('sửa giá ghi lịch sử + tăng version; if_version lệch → 409; điều chỉnh tồn âm → low_stock', async () => {
    const r = await mockTransport.action<{ version: number }>('product.update', {
      product_id: 'pd_4',
      patch: { price: '550000' },
      if_version: 1,
    });
    expect((r.data as { result: { version: number } }).result.version).toBe(2);
    await expect(
      mockTransport.action('product.update', { product_id: 'pd_4', patch: { price: '1' }, if_version: 1 }),
    ).rejects.toMatchObject({ status: 409 });
    const h = productActivitySchema.parse(await mockTransport.get('/products/pd_4/activity'));
    expect(h[0]!.kind).toBe('price');
    const s = await mockTransport.action<{ stock: number; low_stock: boolean }>('stock.adjust', {
      product_id: 'pd_5',
      delta: -9999,
      reason: 'Kiểm kê',
    });
    expect((s.data as { result: { low_stock: boolean } }).result.low_stock).toBe(true);
    expect(productActivitySchema.parse(await mockTransport.get('/products/pd_5/activity'))[0]!.kind).toBe(
      'stock',
    );
  });
});
