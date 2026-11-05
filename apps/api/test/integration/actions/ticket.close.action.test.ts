// Ma trận ticket.close (TIP-023b): đóng: lý do + kết quả SLA dự tính; undo mở lại trạng thái cũ. 403 kế toán (không có ticket.view / ticket.manage) · scope (sales own: ticket người khác → 404)
// · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.close');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.close', () => {
  it('403 kế toán · scope sales own · id lạ', async () => {
    expect((await m.act({ ticket_id: t.ticket_id, reason: 'resolved' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ ticket_id: t.ticket_id, reason: 'resolved' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ ticket_id: t.ticket_id, reason: 'resolved' }, ticket_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ ticket_id: t.ticket_id, reason: 'resolved' });
    expect(preview).toEqual({ summary: `${t.code} · Hoàn tiền buổi lỡ`, risk: 'write', changes: [{ entity: 'ticket', id: t.ticket_id, before: { status: 'open', reason: null, sla_result: null }, after: { status: 'closed', reason: 'resolved', sla_result: 'met' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ status: 'closed', sla_result: 'met' });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).status).toBe('open');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
