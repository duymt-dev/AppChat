// Ma trận conversation.remove_assignee: preview tên đồng phụ trách gỡ · xác nhận → xoá dòng · undo thêm lại · chưa từng thêm → 404 ·
// 403 cs (không có inbox.assign) · id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conv: string;

beforeAll(async () => {
  m = await matrix('conversation.remove_assignee');
  conv = (await m.conv({ title: 'Chị Hương email' })).id;
  await m.h.platform.user.update({ where: { id: m.sales.id }, data: { name: 'Trâm Sales' } });
  await (await m.db()).conversationAssignee.create({ data: { conversationId: conv, kind: 'user', assigneeId: m.sales.id } });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.remove_assignee', () => {
  it('preview Trợ lý: tên người gỡ; xác nhận → xoá dòng; undo → thêm lại', async () => {
    const { preview, done } = await m.confirm({ conversation_id: conv, kind: 'user', assignee_id: m.sales.id });
    expect(preview).toEqual({ summary: 'Chị Hương email · Trâm Sales', risk: 'write', changes: [{ entity: 'conversation_assignee', id: conv, before: { assignee: 'Trâm Sales' } }] });
    expect(done.body.data.result).toEqual({ assignees: 0 });
    expect(await (await m.db()).conversationAssignee.count({ where: { conversationId: conv } })).toBe(0);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).conversationAssignee.count({ where: { conversationId: conv } })).toBe(1);
  });

  it('chưa từng là đồng phụ trách → 404', async () => {
    expect((await m.act({ conversation_id: conv, kind: 'agent', assignee_id: '0190f000-0000-7000-8000-00000000dead' })).status).toBe(404);
  });

  it('403 cs (không có inbox.assign) · id lạ → 404', async () => {
    const cs = await m.act({ conversation_id: conv, kind: 'user', assignee_id: m.sales.id }, m.cs);
    expect([403]).toContain(cs.status);
    expect((await m.act({ conversation_id: '0190f000-0000-7000-8000-00000000beef', kind: 'user', assignee_id: m.sales.id })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
