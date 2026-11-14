// Ma trận ticket.bulk_undo (TIP-034c): hoàn tác hàng loạt chuẩn — bulk (luôn xem trước), chỉ người tạo thao tác đi + ticket.manage hiện
// tại (người khác → 404 như không có), log không phải ticket.bulk_update → 404, xem trước nêu số sẽ hoàn tác / xung đột. Không hoàn tác của
// hoàn tác (không khai undo). Luồng đầy đủ (một phần, hội tụ, niêm phong, OPERATION_BUSY): ticket-bulk.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { call } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.bulk_undo');
  t = await m.seed('ticket.create', { title: 'Đổi lịch', channel: 'email', category: 'Refund', priority: 'medium' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.bulk_undo', () => {
  it('403 kế toán · log lạ / không phải hàng loạt → 404', async () => {
    expect((await m.act({ parent_action_log_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const single = await m.seed('ticket.update', { ticket_id: t.ticket_id, title: 'Đổi lịch hẹn' }).then(async () => (await m.db()).actionLog.findFirstOrThrow({ where: { actionId: 'ticket.update' }, orderBy: { createdAt: 'desc' } }));
    expect((await m.act({ parent_action_log_id: single.id })).status).toBe(404);
    expect((await m.act({ parent_action_log_id: single.id }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('xem trước → xác nhận: chỉ trường đã đổi, log cha undone; người khác → 404', async () => {
    const key = uuidv7();
    const input = { ticket_ids: [t.ticket_id], priority: 'high' };
    const post = (body: unknown) => call(m.h, '/actions/ticket.bulk_update', body, { 'idempotency-key': key }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
    const p = await post({ input });
    const done = await post({ input, confirm_token: p.body.data.confirm_token });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const logId = done.body.data.action_log_id as string;
    expect((await m.act({ parent_action_log_id: logId }, m.sales)).status).toBe(404);
    const { preview, done: u } = await m.confirm({ parent_action_log_id: logId });
    expect(preview).toMatchObject({ risk: 'write', count: 1, changes: [{ entity: 'ticket_bulk_undo', after: { revert: 1 } }] });
    expect(u.body.data.result).toMatchObject({ undone: 1, conflicts: 0, failed: 0 });
    const db = await m.db();
    expect((await db.ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).priority).toBe('medium');
    expect((await db.actionLog.findUniqueOrThrow({ where: { id: logId } })).status).toBe('undone');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(m.def.agentGrantable).toBe(false);
  });
});
