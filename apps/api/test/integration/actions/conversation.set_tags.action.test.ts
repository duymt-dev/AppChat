// Ma trận conversation.set_tags (TIP-023b): đặt danh sách thẻ; undo trả danh sách cũ. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('conversation.set_tags');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('conversation.set_tags', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, tags: ['VIP', 'Hẹn lại'] }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, tags: ['VIP', 'Hẹn lại'] }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, tags: ['VIP', 'Hẹn lại'] }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, tags: ['VIP', 'Hẹn lại'] });
    expect(preview).toEqual({ summary: 'Khách web', risk: 'write', changes: [{ entity: 'conversation', id: c.id, before: { tags: [] }, after: { tags: ['VIP', 'Hẹn lại'] } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.tags).toEqual(['VIP', 'Hẹn lại']);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).conversationTag.count({ where: { conversationId: c.id } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
