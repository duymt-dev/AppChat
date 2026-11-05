// Ma trận conversation.handoff (TIP-023b): nhận lại hội thoại AI chuyển — gán cho người ra lệnh. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('conversation.handoff');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('conversation.handoff', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id });
    expect(preview).toEqual({ summary: 'Khách web', risk: 'write', changes: [{ entity: 'conversation', id: c.id, before: { assignee_user_id: null }, after: { assignee_user_id: m.h.user } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).assigneeUserId).toBe(m.h.user);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
