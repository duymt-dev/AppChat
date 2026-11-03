// Ma trận product.search (TIP-023b R2): happy (không dấu, theo loại, giá string VND hiện hành) · 403 (accountant… đều có catalog.view → kiểm
// user ngoài workspace) · nguồn assistant · ≤ 20 dòng. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let p: string;

beforeAll(async () => {
  m = await matrix('product.search');
  p = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
}, 120_000);
afterAll(() => m?.close());

describe('product.search', () => {
  it('happy: tìm không dấu, lọc loại, giá hiện hành', async () => {
    const r = await m.act({ query: 'hifu', type: 'service' });
    expect(r.body.data.result.items).toEqual([expect.objectContaining({ product_id: p, name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8, status: 'active' })]);
    expect((await m.act({ query: 'hifu', type: 'physical' })).body.data.result.items).toEqual([]);
  });

  it('403: người ngoài workspace', async () => {
    expect((await m.act({ query: 'hifu' }, { id: 'x', token: m.h.tokenFor('0190f000-0000-7000-8000-0000000000aa') })).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ query: 'hifu' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.items).toHaveLength(1);
  });

  it('giới hạn: limit > 20 bị từ chối', async () => {
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
