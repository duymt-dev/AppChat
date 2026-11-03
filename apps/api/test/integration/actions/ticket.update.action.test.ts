// Ma trận ticket.update (TIP-023b): trước / sau chỉ trường đổi; undo trả giá trị cũ. 403 kế toán (không có ticket.view / ticket.manage) · scope (sales own: ticket người khác → 404)
// · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.update');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.update', () => {
  it('403 kế toán · scope sales own · id lạ', async () => {
    expect((await m.act({ ticket_id: t.ticket_id, priority: 'low', title: 'Hoàn tiền buổi lỡ' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ ticket_id: t.ticket_id, priority: 'low', title: 'Hoàn tiền buổi lỡ' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ ticket_id: t.ticket_id, priority: 'low', title: 'Hoàn tiền buổi lỡ' }, ticket_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ ticket_id: t.ticket_id, priority: 'low', title: 'Hoàn tiền buổi lỡ' });
    expect(preview).toEqual({ summary: `${t.code} · Hoàn tiền buổi lỡ`, risk: 'write', changes: [{ entity: 'ticket', id: t.ticket_id, before: { priority: 'high' }, after: { priority: 'low' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).priority).toBe('low');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).priority).toBe('high');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
