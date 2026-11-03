// Ma trận ticket.get (TIP-023b R2): happy (trạng thái / ưu tiên / hạn SLA, mở drawer) · 403 (kế toán không có ticket.view) · scope (sales
// own đọc ticket người khác → 404) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let t: { ticket_id: string; code: string };

beforeAll(async () => {
  m = await matrix('ticket.get');
  t = await m.seed('ticket.create', { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' });
}, 120_000);
afterAll(() => m?.close());

describe('ticket.get', () => {
  it('happy', async () => {
    const r = await m.act({ ticket_id: t.ticket_id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: t.ticket_id, code: t.code, title: 'Hoàn tiền buổi lỡ', status: 'open', priority: 'high', frt_due_at: expect.any(String) });
    expect(r.body.data.ui_target).toEqual({ type: 'open', entity: 'ticket', id: t.ticket_id, view: 'drawer' });
  });

  it('403: kế toán không có ticket.view', async () => {
    expect((await m.act({ ticket_id: t.ticket_id }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: sales own → 404; id lạ → 404', async () => {
    expect((await m.act({ ticket_id: t.ticket_id }, m.sales)).status).toBe(404);
    expect((await m.act({ ticket_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay', async () => {
    expect((await m.act({ ticket_id: t.ticket_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
