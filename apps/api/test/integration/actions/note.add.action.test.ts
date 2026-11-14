// Ma trận note.add (TIP-023b): ghi chú nội bộ (không gửi kênh); undo xoá ghi chú. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('note.add');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('note.add', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, text: 'Khách hẹn 14h' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, text: 'Khách hẹn 14h' }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, text: 'Khách hẹn 14h' }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, text: 'Khách hẹn 14h' });
    expect(preview).toEqual({ summary: 'Khách web · Khách hẹn 14h', risk: 'write', changes: [{ entity: 'note', after: { text: 'Khách hẹn 14h' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).message.findUniqueOrThrow({ where: { id: done.body.data.result.message_id } })).kind).toBe('note');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).message.count({ where: { conversationId: c.id, kind: 'note' } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
