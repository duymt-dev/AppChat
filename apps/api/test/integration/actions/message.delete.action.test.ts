// Ma trận message.delete (TIP-023b): xoá tin trong AppChat (risk delete); undo khôi phục. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('message.delete');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('message.delete', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, message_id: c.message }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, message_id: c.message }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, message_id: c.message });
    expect(preview).toEqual({ summary: 'Khách web · Chào shop', risk: 'delete', changes: [{ entity: 'message', id: c.message, before: { text: 'Chào shop' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).message.findUniqueOrThrow({ where: { id: c.message } })).deletedAt).not.toBeNull();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).message.findUniqueOrThrow({ where: { id: c.message } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
