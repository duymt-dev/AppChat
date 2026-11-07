// Ma trận conversation.assign (TIP-023b): preview Trợ lý (người phụ trách trước / sau theo tên) · undo trả người cũ · user_id lẫn agent_id →
// 422 · người không phải thành viên → lỗi · 403 (cs không có inbox.assign) · id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conv: string;

beforeAll(async () => {
  m = await matrix('conversation.assign');
  conv = (await m.conv({ title: 'Anh Tuấn web' })).id;
  await m.h.platform.user.update({ where: { id: m.sales.id }, data: { name: 'Trâm Sales' } });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.assign', () => {
  it('preview Trợ lý: tên người mới; xác nhận → gán; undo → bỏ gán', async () => {
    const { preview, done } = await m.confirm({ conversation_id: conv, user_id: m.sales.id });
    expect(preview).toEqual({ summary: 'Anh Tuấn web · Trâm Sales', risk: 'write', changes: [{ entity: 'conversation', id: conv, before: { assignee: null }, after: { assignee: 'Trâm Sales' } }] });
    expect(done.body.data.result).toEqual({ assignee_user_id: m.sales.id, assignee_agent_id: null });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: conv } })).assigneeUserId).toBeNull();
  });

  it('cả user_id lẫn agent_id → 422; người ngoài workspace → lỗi', async () => {
    expect((await m.act({ conversation_id: conv, user_id: m.sales.id, agent_id: 'a1' })).status).toBe(422);
    expect((await m.act({ conversation_id: conv, user_id: '0190f000-0000-7000-8000-00000000cafe' })).status).toBeGreaterThanOrEqual(400);
  });

  it('403 cs (không có inbox.assign) · id lạ → 404', async () => {
    const cs = await m.act({ conversation_id: conv, user_id: m.sales.id }, m.cs);
    expect([403]).toContain(cs.status);
    expect((await m.act({ conversation_id: '0190f000-0000-7000-8000-00000000beef', user_id: m.sales.id })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
