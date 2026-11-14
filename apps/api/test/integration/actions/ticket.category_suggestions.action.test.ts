// Ma trận ticket.category_suggestions (TIP-034b §2): happy (cấu hình + nhãn đã dùng trong ticket người gọi thấy) · 403 (kế toán không có
// ticket.view) · scope (sales own không thấy nhãn ticket người khác) · nguồn assistant / agent (agentGrantable — chưa cấp thì agent bị chặn).
// Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('ticket.category_suggestions');
  await m.seed('ticket.create', { title: 'Nhãn riêng của Owner', channel: 'email', category: 'Nhãn chỉ Owner thấy', priority: 'low' });
  await m.seed('ticket.create', { title: 'Nhãn của sales', channel: 'email', category: 'Nhãn sales tạo', priority: 'low' }, m.sales);
}, 120_000);
afterAll(() => m?.close());

describe('ticket.category_suggestions', () => {
  it('happy: cấu hình (version 0) + nhãn đã dùng', async () => {
    const r = await m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.config).toMatchObject({ version: 0 });
    expect(r.body.data.result.used).toEqual(expect.arrayContaining(['Nhãn chỉ Owner thấy', 'Nhãn sales tạo']));
    expect(r.body.data.result.next_cursor).toBeNull();
  });

  it('403: kế toán không có ticket.view', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: sales own chỉ thấy nhãn ticket mình tạo; cursor hỏng → 403', async () => {
    const r = await m.act({}, m.sales);
    expect(r.body.data.result.used).toContain('Nhãn sales tạo');
    expect(r.body.data.result.used).not.toContain('Nhãn chỉ Owner thấy');
    expect((await m.act({ cursor: 'abc' }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant chạy ngay; agent chưa được cấp → bị chặn (không tự cấp)', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({}, undefined, { 'x-action-source': 'agent' })).status).toBeGreaterThanOrEqual(400);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
