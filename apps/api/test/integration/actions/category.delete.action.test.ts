// Ma trận category.delete (TIP-032b): xoá danh mục trống (risk config); còn sản phẩm (kể cả đã lưu trữ) → 409 has_products + số; 403 sales.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const idOf = async (name: string) => (await (await m.db()).productCategory.findFirstOrThrow({ where: { name } })).id;

beforeAll(async () => {
  m = await matrix('category.delete');
  await m.seed('category.create', { name: 'Trống' });
  await m.seed('product.create', { name: 'Serum', type: 'physical', price: '100000', category: 'Có hàng' });
}, 120_000);
afterAll(() => m?.close());

describe('category.delete', () => {
  it('403 sales · còn sản phẩm → 409 kèm số', async () => {
    expect((await m.act({ category_id: await idOf('Trống') }, m.sales)).status).toBe(403);
    const r = await m.act({ category_id: await idOf('Có hàng') });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toMatchObject({ category_id: 'has_products' });
  });

  it('preview Trợ lý → xác nhận xoá danh mục trống', async () => {
    const id = await idOf('Trống');
    const { preview, done } = await m.confirm({ category_id: id });
    expect(preview).toMatchObject({ summary: 'Trống', risk: 'config' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await (await m.db()).productCategory.count({ where: { id } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
