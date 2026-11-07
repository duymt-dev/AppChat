// Ma trận contact.export (TIP-023b R2): happy (CSV theo bộ lọc của màn) · 403 (sales không có crm.export) · nguồn assistant. Idempotency / undo
// / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('contact.export');
  await m.seed('contact.create', { full_name: 'Chị Lan Xuất', phone: '0909490001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.export', () => {
  it('happy: CSV có khách theo bộ lọc', async () => {
    const r = await m.act({ q: 'Lan Xuất' });
    expect(r.body.data.result).toMatchObject({ mime: 'text/csv', rows: 1 });
    expect(r.body.data.result.content).toContain('Chị Lan Xuất');
  });

  it('403: sales không có crm.export', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ q: 'Lan Xuất' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.rows).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
