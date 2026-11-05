// Ma trận ticket.bulk_update (TIP-023b): hàng loạt: số ticket còn mở + thay đổi chung; undo trả ưu tiên cũ. 403 kế toán (không có ticket.view / ticket.manage) · scope (sales own: ticket người khác → 404)
// · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.bulk_update');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.bulk_update', () => {
  it('403 kế toán · scope sales own · id lạ', async () => {
    expect((await m.act({ ticket_ids: [t.ticket_id], priority: 'low' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ ticket_ids: [t.ticket_id], priority: 'low' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ ticket_ids: [t.ticket_id], priority: 'low' }, ticket_ids: ['0190f000-0000-7000-8000-00000000beef'] })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ ticket_ids: [t.ticket_id], priority: 'low' });
    expect(preview).toEqual({ summary: '1', risk: 'write', count: 1, changes: [{ entity: 'ticket', after: { priority: 'low' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ updated: 1 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).priority).toBe('high');
  });

  it('ô không áp dụng có lý do', () => {
    // ActionDef chưa khai `bulk` (Blueprint §3.3 muốn bulk luôn preview kèm số bản ghi) — Q-043.
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
