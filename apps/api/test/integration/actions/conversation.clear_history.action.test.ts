// Ma trận conversation.clear_history (TIP-023b): xoá lịch sử trong AppChat (risk delete, đếm tin bị ẩn); undo trả mốc; cần inbox.manage nên sales 403. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('conversation.clear_history');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('conversation.clear_history', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id });
    expect(preview).toEqual({ summary: 'Khách web', risk: 'delete', count: 1, changes: [{ entity: 'conversation', id: c.id, before: { messages: 1 }, after: { messages: 0 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).clearedAt).not.toBeNull();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).clearedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
