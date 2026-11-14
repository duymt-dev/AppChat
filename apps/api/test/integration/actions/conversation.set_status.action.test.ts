// Ma trận conversation.set_status (TIP-023b): preview Trợ lý (trước / sau trạng thái) · tạm ẩn thiếu thời hạn → 422 · undo trả trạng thái
// cũ · 403 (kế toán không có inbox.reply) · scope (sales own sửa hội thoại người khác → 403 SCOPE_FORBIDDEN; id lạ → 404) · gọi lặp cùng
// trạng thái cùng kết quả.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conv: string;

beforeAll(async () => {
  m = await matrix('conversation.set_status');
  conv = (await m.conv({ title: 'Chị Hoa web' })).id;
}, 120_000);
afterAll(() => m?.close());

describe('conversation.set_status', () => {
  it('preview Trợ lý: tên + trước / sau; xác nhận → đóng; undo → mở lại', async () => {
    const { preview, done } = await m.confirm({ conversation_id: conv, status: 'closed' });
    expect(preview).toEqual({ summary: 'Chị Hoa web', risk: 'write', changes: [{ entity: 'conversation', id: conv, before: { status: 'open' }, after: { status: 'closed' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: conv } })).status).toBe('open');
  });

  it('tạm ẩn thiếu snooze_hours → 422; có → snoozed', async () => {
    expect((await m.act({ conversation_id: conv, status: 'snoozed' })).status).toBe(422);
    expect((await m.act({ conversation_id: conv, status: 'snoozed', snooze_hours: 3 })).body.data.result).toEqual({ status: 'snoozed' });
  });

  it('403 kế toán · scope: sales own → 403 SCOPE_FORBIDDEN · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: conv, status: 'open' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: conv, status: 'open' }, m.sales)).body.error.code).toBe('SCOPE_FORBIDDEN');
    expect((await m.act({ conversation_id: '0190f000-0000-7000-8000-00000000beef', status: 'open' })).status).toBe(404);
  });

  it('gọi lặp cùng trạng thái → cùng kết quả', async () => {
    const a = await m.act({ conversation_id: conv, status: 'pending' });
    expect((await m.act({ conversation_id: conv, status: 'pending' })).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
