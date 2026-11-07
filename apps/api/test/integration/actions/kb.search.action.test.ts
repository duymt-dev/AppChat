// Ma trận kb.search (TIP-023b R2): visibility — người có kb.manage thấy nguồn internal, sales chỉ public (D54) · truy vấn rỗng → 422 · nguồn
// assistant. Embedder giả của harness (không gọi OpenAI). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('kb.search');
  await m.seed('kb.add_source', { name: 'Bảng giá nội bộ', text: 'Giá vốn serum B5 là 120000', visibility: 'internal' });
}, 120_000);
afterAll(() => m?.close());

describe('kb.search', () => {
  it('visibility: sales không thấy nguồn internal', async () => {
    const r = await m.act({ query: 'giá vốn serum' }, m.sales);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(JSON.stringify(r.body.data.result.chunks)).not.toContain('Bảng giá nội bộ');
  });

  it('truy vấn rỗng → 422', async () => {
    expect((await m.act({ query: '' })).status).toBe(422);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ query: 'giá serum' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(typeof r.body.data.result.grounded).toBe('boolean');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
