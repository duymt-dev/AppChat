// Ma trận product_variant.create (TIP-032b): thêm biến thể (risk write); SKU trùng biến thể đang bán / mã sản phẩm → 409; undo lưu trữ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: { product_id: string };

beforeAll(async () => {
  m = await matrix('product_variant.create');
  p = await m.seed('product.create', { name: 'Áo thun', type: 'physical', price: '200000', sku: 'AO' });
}, 120_000);
afterAll(() => m?.close());

describe('product_variant.create', () => {
  it('403 sales · SKU trùng mã sản phẩm 409', async () => {
    expect((await m.act({ product_id: p.product_id, name: 'L', sku: 'AO-L' }, m.sales)).status).toBe(403);
    expect((await m.act({ product_id: p.product_id, name: 'L', sku: 'ao' })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận → SKU trùng 409 → undo (lưu trữ) giải phóng SKU', async () => {
    const { preview, done } = await m.confirm({ product_id: p.product_id, name: 'Size L', sku: 'AO-L', price: '220000' });
    expect(preview).toMatchObject({ summary: 'AO · Áo thun · Size L', risk: 'write' });
    expect(done.body.data.result).toMatchObject({ sku: 'AO-L' });
    expect((await m.act({ product_id: p.product_id, name: 'L2', sku: 'AO-L' })).status).toBe(409);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await m.act({ product_id: p.product_id, name: 'L2', sku: 'AO-L' })).status).toBe(200);
  });

  it('idempotency: cùng khoá → cùng biến thể', async () => {
    const k = '0190f000-0000-7000-8000-0000000c0001';
    const a = await m.actWithKey(k, { product_id: p.product_id, name: 'M', sku: 'AO-M' });
    const b = await m.actWithKey(k, { product_id: p.product_id, name: 'M', sku: 'AO-M' });
    expect(a.status).toBe(200);
    expect(b.body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
