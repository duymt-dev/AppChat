// Ma trận ticket.search (TIP-023b R2): happy (từ khoá không dấu, trạng thái, ưu tiên) · scope (sales own không thấy ticket của owner) · nguồn
// assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: string;

beforeAll(async () => {
  m = await matrix('ticket.search');
  t = (await m.seed('ticket.create', { title: 'Khách báo lỗi thanh toán', channel: 'zalo_personal', category: 'Billing', priority: 'high', description: 'Chuyển khoản không nhận' })).ticket_id;
}, 120_000);
afterAll(() => m?.close());

describe('ticket.search', () => {
  it('happy: từ khoá không dấu + ưu tiên', async () => {
    const r = await m.act({ q: 'loi thanh toan', priority: 'high' });
    expect(JSON.stringify(r.body.data.result)).toContain(t);
    expect(JSON.stringify((await m.act({ q: 'loi thanh toan', status: 'closed' })).body.data.result)).not.toContain(t);
  });

  it('scope: sales (own) không thấy ticket của owner', async () => {
    const r = await m.act({ q: 'thanh toan' }, m.sales);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body.data.result)).not.toContain(t);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ q: 'thanh toan' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(JSON.stringify(r.body.data.result)).toContain(t);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
