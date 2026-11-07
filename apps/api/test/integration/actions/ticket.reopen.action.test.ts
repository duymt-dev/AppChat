// Ma trận ticket.reopen (TIP-023b): mở lại ticket đã đóng: trạng thái + số lần mở lại. 403 kế toán (không có ticket.view / ticket.manage) · scope (sales own: ticket người khác → 404)
// · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.reopen');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
  await m.seed('ticket.close', { ticket_id: t.ticket_id, reason: 'resolved' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.reopen', () => {
  it('403 kế toán · scope sales own · id lạ', async () => {
    expect((await m.act({ ticket_id: t.ticket_id }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ ticket_id: t.ticket_id }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ ticket_id: t.ticket_id }, ticket_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ ticket_id: t.ticket_id });
    expect(preview).toEqual({ summary: `${t.code} · Hoàn tiền buổi lỡ`, risk: 'write', changes: [{ entity: 'ticket', id: t.ticket_id, before: { status: 'closed', reopened: 0 }, after: { status: 'open', reopened: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).reopenedCount).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
