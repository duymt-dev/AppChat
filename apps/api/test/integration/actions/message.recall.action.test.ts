// Ma trận message.recall (TIP-023b): thu hồi tin của mình (risk send); tin khách vào → 403 not_own. Preview Trợ lý → xác nhận · 403 kế toán (không quyền hộp thư) · scope (sales own
// sửa hội thoại người khác → 403) · id lạ → 404 · ô không áp dụng có lý do theo ActionDef.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };
let out: string;

beforeAll(async () => {
  m = await matrix('message.recall');
  c = await m.conv();
  out = uuidv7();
  await (await m.db()).message.create({
    data: { id: out, conversationId: c.id, channelAccountId: c.account, direction: 'out', senderType: 'user', senderId: m.h.user, kind: 'text', body: 'Tin gửi nhầm', status: 'sent', createdAt: m.h.clock.now() },
  });
}, 120_000);
afterAll(() => m?.close());

describe('message.recall', () => {
  it('403 kế toán · scope sales own · id lạ → 404', async () => {
    expect((await m.act({ conversation_id: c.id, message_id: out }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ conversation_id: c.id, message_id: out }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ conversation_id: c.id, message_id: out }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, message_id: out });
    expect(preview).toEqual({ summary: 'Khách web · Tin gửi nhầm', risk: 'send', changes: [{ entity: 'message', id: out, before: { recalled: false }, after: { recalled: true } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ conversation_id: c.id, message_id: c.message })).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
