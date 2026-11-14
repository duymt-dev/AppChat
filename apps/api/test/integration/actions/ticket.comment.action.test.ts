// Ma trận ticket.comment (TIP-023b): ghi chú nội bộ (không gửi kênh); undo xoá mềm. 403 kế toán (không có ticket.view / ticket.manage) · scope (sales own: ticket người khác → 404)
// · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.comment');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.comment', () => {
  it('403 kế toán · scope sales own · id lạ', async () => {
    expect((await m.act({ ticket_id: t.ticket_id, body: 'Đã gọi khách', internal: true }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ ticket_id: t.ticket_id, body: 'Đã gọi khách', internal: true }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ ticket_id: t.ticket_id, body: 'Đã gọi khách', internal: true }, ticket_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ ticket_id: t.ticket_id, body: 'Đã gọi khách', internal: true });
    expect(preview).toEqual({ summary: `${t.code} · Hoàn tiền buổi lỡ`, risk: 'write', changes: [{ entity: 'ticket_comment', after: { body: 'Đã gọi khách', internal: true } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.ticket_id).toBe(t.ticket_id);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).ticketComment.findUniqueOrThrow({ where: { id: done.body.data.result.comment_id } })).deletedAt).not.toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
