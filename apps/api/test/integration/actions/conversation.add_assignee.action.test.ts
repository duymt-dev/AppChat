// Ma trận conversation.add_assignee (đồng phụ trách hội thoại, không đổi phụ trách chính): preview tên người/agent mới · xác nhận →
// thêm dòng conversation_assignee · undo gỡ · trùng phụ trách chính → 422 · người ngoài workspace → lỗi · agent xoá/lạ → 404 ·
// 403 cs (không có inbox.assign) · id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { conversationSchema } from '@appchat/shared';
import { call } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conv: string;
let bot: string;

const getConv = async (id: string) => {
  const r = await call(m.h, `/conversations/${id}`);
  const body = (await r.json()) as { data: unknown };
  return conversationSchema.parse(body.data);
};

beforeAll(async () => {
  m = await matrix('conversation.add_assignee');
  conv = (await m.conv({ title: 'Anh Tuấn web', assignee: m.h.user })).id;
  await m.h.platform.user.update({ where: { id: m.sales.id }, data: { name: 'Trâm Sales' } });
  bot = uuidv7();
  await (await m.db()).aiAgent.create({ data: { id: bot, name: 'Bot CSKH', status: 'active', publishedVersion: 1, channels: [] } });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.add_assignee', () => {
  it('preview Trợ lý: tên người mới; xác nhận → thêm dòng; undo → gỡ', async () => {
    const { preview, done } = await m.confirm({ conversation_id: conv, kind: 'user', assignee_id: m.sales.id });
    expect(preview).toEqual({ summary: 'Anh Tuấn web · Trâm Sales', risk: 'write', changes: [{ entity: 'conversation_assignee', id: conv, before: { assignee: null }, after: { assignee: 'Trâm Sales' } }] });
    expect(done.body.data.result).toEqual({ assignees: 1 });
    expect(await (await m.db()).conversationAssignee.count({ where: { conversationId: conv } })).toBe(1);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).conversationAssignee.count({ where: { conversationId: conv } })).toBe(0);
  });

  it('thêm agent làm đồng phụ trách', async () => {
    const r = await m.act({ conversation_id: conv, kind: 'agent', assignee_id: bot });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ assignees: 1 });
    expect(await (await m.db()).conversationAssignee.count({ where: { conversationId: conv, kind: 'agent', assigneeId: bot } })).toBe(1);
  });

  it('GET /conversations/:id trả co_assignees sau khi thêm', async () => {
    await m.act({ conversation_id: conv, kind: 'agent', assignee_id: bot });
    const dto = await getConv(conv);
    expect(dto.co_assignees).toEqual([{ kind: 'agent', id: bot, name: 'Bot CSKH' }]);
    await (await m.db()).conversationAssignee.deleteMany({ where: { conversationId: conv, kind: 'agent', assigneeId: bot } });
  });

  it('trùng phụ trách chính → 422; người ngoài workspace → lỗi; agent lạ → 404', async () => {
    expect((await m.act({ conversation_id: conv, kind: 'user', assignee_id: m.h.user })).status).toBe(422);
    expect((await m.act({ conversation_id: conv, kind: 'user', assignee_id: '0190f000-0000-7000-8000-00000000cafe' })).status).toBeGreaterThanOrEqual(400);
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
