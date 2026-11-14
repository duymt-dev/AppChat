// Ma trận product_variant.archive (TIP-032b): lưu trữ (giữ dòng — đơn cũ còn trỏ, không xoá); lặp lại an toàn; undo khôi phục.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let v: string;

beforeAll(async () => {
  m = await matrix('product_variant.archive');
  const p = await m.seed('product.create', { name: 'Áo', type: 'physical', price: '200000', sku: 'AR' });
  v = (await m.seed('product_variant.create', { product_id: p.product_id, name: 'L', sku: 'AR-L' })).variant_id;
}, 120_000);
afterAll(() => m?.close());

describe('product_variant.archive', () => {
  it('403 sales', async () => {
    expect((await m.act({ variant_id: v }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận (dòng còn, archived) → lặp lại 200 → undo', async () => {
    const { preview, done } = await m.confirm({ variant_id: v });
    expect(preview).toMatchObject({ summary: 'AR-L · L', risk: 'write' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).productVariant.findUniqueOrThrow({ where: { id: v } })).status).toBe('archived');
    expect((await m.act({ variant_id: v })).status).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).productVariant.findUniqueOrThrow({ where: { id: v } })).status).toBe('active');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
