// Ma trận conversation.get (TIP-023b R2): happy (tin cũ → mới, tin thu hồi không có nội dung, giới hạn, mở trang hội thoại) · 403 (kế toán)
// · scope (sales own đọc hội thoại người khác → 404; id lạ → 404) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conv: string;

beforeAll(async () => {
  m = await matrix('conversation.get');
  const db = await m.db();
  const acc = uuidv7();
  conv = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web', status: 'connected' } });
  await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, title: 'Khách web', lastMessageAt: m.h.clock.now() } });
  const msg = async (body: string, recalled = false) => {
    m.h.clock.advance(1000);
    const at = m.h.clock.now();
    await db.message.create({
      data: { id: uuidv7(), conversationId: conv, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body, externalMsgId: uuidv7(), status: 'delivered', createdAt: at, recalledAt: recalled ? at : null },
    });
  };
  await msg('Chào shop');
  await msg('Số tài khoản cũ', true);
  await msg('Còn lịch chiều nay không?');
}, 120_000);
afterAll(() => m?.close());

const texts = (r: { body: { data: { result: { messages: { text: string }[] } } } }) => r.body.data.result.messages.map((x) => x.text);

describe('conversation.get', () => {
  it('happy: tin cũ → mới, tin thu hồi không trả nội dung, mở trang hội thoại', async () => {
    const r = await m.act({ conversation_id: conv });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: conv, title: 'Khách web', channel: 'webchat' });
    expect(texts(r)).toEqual(['Chào shop', '', 'Còn lịch chiều nay không?']);
    expect(r.body.data.ui_target).toEqual({ type: 'open', entity: 'conversation', id: conv, view: 'page' });
    expect(texts(await m.act({ conversation_id: conv, limit: 1 }))).toEqual(['Còn lịch chiều nay không?']);
  });

  it('tin gửi đi mang trạng thái giao (TIP-014b): unknown / partial hiện đúng cho Trợ lý, không thành "đã gửi"', async () => {
    const db = await m.db();
    const acc = (await db.conversation.findUniqueOrThrow({ where: { id: conv } })).channelAccountId;
    for (const status of ['unknown', 'partial'] as const) {
      m.h.clock.advance(1000);
      await db.message.create({ data: { id: uuidv7(), conversationId: conv, channelAccountId: acc, direction: 'out', senderType: 'user', senderId: m.h.user, kind: 'text', body: `Tin ${status}`, status, createdAt: m.h.clock.now() } });
    }
    const r = await m.act({ conversation_id: conv, limit: 2 });
    expect(r.body.data.result.messages.map((x: { text: string; status: string }) => [x.text, x.status])).toEqual([['Tin unknown', 'unknown'], ['Tin partial', 'partial']]);
  });

  it('403: kế toán không có inbox.view', async () => {
    expect((await m.act({ conversation_id: conv }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: sales own → 404; id lạ → 404', async () => {
    expect((await m.act({ conversation_id: conv }, m.sales)).status).toBe(404);
    expect((await m.act({ conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay', async () => {
    expect((await m.act({ conversation_id: conv }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
