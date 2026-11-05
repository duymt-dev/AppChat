// Ma trận message.forward (TIP-023b): chuyển tiếp tin sang hội thoại khác (risk send, nêu hội thoại + kênh đích). Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };
let t: { id: string };

beforeAll(async () => {
  m = await matrix('message.forward');
  c = await m.conv();
  t = await m.conv({ title: 'Anh Đích' });
}, 120_000);
afterAll(() => m?.close());

describe('message.forward', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: c.message, target_conversation_id: t.id }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, message_id: c.message, target_conversation_id: t.id }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, message_id: c.message, target_conversation_id: t.id }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, message_id: c.message, target_conversation_id: t.id });
    expect(preview).toEqual({ summary: 'Anh Đích · webchat · Chào shop', risk: 'send', changes: [{ entity: 'message', after: { to: 'Anh Đích', channel: 'webchat', text: 'Chào shop', forwarded_from_id: c.message } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await (await m.db()).message.findUniqueOrThrow({ where: { id: done.body.data.result.message_id } })).toMatchObject({ conversationId: t.id, body: 'Chào shop' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
