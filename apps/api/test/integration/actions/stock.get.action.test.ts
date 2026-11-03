// Ma trận stock.get (TIP-023b R2): happy (tồn + cờ sắp hết, id lạ bỏ qua) · > 50 id → 422 · nguồn assistant. Idempotency / undo / trạng
// thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: string;

beforeAll(async () => {
  m = await matrix('stock.get');
  p = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '350000', tax_rate: 8, stock: 3, low_stock_threshold: 5 })).product_id;
}, 120_000);
afterAll(() => m?.close());

describe('stock.get', () => {
  it('happy: tồn + sắp hết; id lạ bỏ qua', async () => {
    const r = await m.act({ product_ids: [p, '0190f000-0000-7000-8000-00000000beef'] });
    expect(r.body.data.result.items).toEqual([{ product_id: p, name: 'Serum B5', stock: 3, low: true }]);
  });

  it('giới hạn: > 50 id → 422', async () => {
    expect((await m.act({ product_ids: Array.from({ length: 51 }, () => p) })).status).toBe(422);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ product_ids: [p] }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.items).toHaveLength(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
