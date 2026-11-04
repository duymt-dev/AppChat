// Ma trận product_variant.update (TIP-032b): sửa tên / SKU / giá (risk write); if_version cũ → 409 STALE_VERSION; undo về giá cũ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let v: string;

beforeAll(async () => {
  m = await matrix('product_variant.update');
  const p = await m.seed('product.create', { name: 'Áo', type: 'physical', price: '200000', sku: 'AU' });
  v = (await m.seed('product_variant.create', { product_id: p.product_id, name: 'L', sku: 'AU-L' })).variant_id;
}, 120_000);
afterAll(() => m?.close());

describe('product_variant.update', () => {
  it('403 sales · id lạ 404', async () => {
    expect((await m.act({ variant_id: v, patch: { price: '1' } }, m.sales)).status).toBe(403);
    expect((await m.act({ variant_id: '0190f000-0000-7000-8000-00000000beef', patch: { price: '1' } })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → if_version cũ 409 → undo về giá cũ', async () => {
    const { preview, done } = await m.confirm({ variant_id: v, patch: { price: '230000' }, if_version: 1 });
    expect(preview).toMatchObject({ summary: 'AU-L · L', risk: 'write' });
    expect(done.body.data.result).toEqual({ variant_id: v, version: 2 });
    const stale = await m.act({ variant_id: v, patch: { price: '1' }, if_version: 1 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).productVariant.findUniqueOrThrow({ where: { id: v } })).price).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
