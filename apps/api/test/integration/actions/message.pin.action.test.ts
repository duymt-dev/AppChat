// Ma trận message.pin (TIP-023b): ghim tin trong hội thoại. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('message.pin');
  c = await m.conv();
}, 120_000);
afterAll(() => m?.close());

describe('message.pin', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message, pinned: true }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, message_id: c.message, pinned: true }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, message_id: c.message, pinned: true }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, message_id: c.message, pinned: true });
    expect(preview).toEqual({ summary: 'Khách web · Chào shop', risk: 'write', changes: [{ entity: 'conversation', id: c.id, before: { pinned_message_id: null }, after: { pinned_message_id: c.message } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).conversation.findUniqueOrThrow({ where: { id: c.id } })).pinnedMessageId).toBe(c.message);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
