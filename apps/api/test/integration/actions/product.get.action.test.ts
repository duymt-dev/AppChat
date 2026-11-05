// Ma trận product.get (TIP-023b R2): happy theo id / theo mã (mô tả, thuộc tính, thành phần) · id lạ → 404 · thiếu id lẫn mã → 422 · nguồn
// assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: string;

beforeAll(async () => {
  m = await matrix('product.get');
  p = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
}, 120_000);
afterAll(() => m?.close());

describe('product.get', () => {
  it('happy: theo id và theo mã', async () => {
    const r = await m.act({ product_id: p });
    expect(r.body.data.result).toMatchObject({ product_id: p, name: 'HIFU nâng cơ', price: '1500000', components: [] });
    expect((await m.act({ code: r.body.data.result.code })).body.data.result.product_id).toBe(p);
  });

  it('biến thể đang bán kèm mã (TIP-032b — đường tra variant_id); biến thể lưu trữ không trả', async () => {
    const keep = (await m.seed('product_variant.create', { product_id: p, name: 'Gói 60 phút', sku: 'HF-60', price: '1800000' })).variant_id;
    const gone = (await m.seed('product_variant.create', { product_id: p, name: 'Gói cũ', sku: 'HF-OLD' })).variant_id;
    await m.seed('product_variant.archive', { variant_id: gone });
    expect((await m.act({ product_id: p })).body.data.result.variants).toEqual([{ variant_id: keep, name: 'Gói 60 phút', sku: 'HF-60', price: '1800000' }]);
  });

  it('id lạ → 404 · thiếu id / mã → 422', async () => {
    expect((await m.act({ product_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({})).status).toBe(422);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ product_id: p }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.product_id).toBe(p);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
