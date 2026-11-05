// Ma trận conversation.search (TIP-023b R2): happy (bỏ dấu, lọc khách / kênh) · 403 (kế toán không có inbox.view) · scope (sales own chỉ
// thấy hội thoại mình phụ trách) · nguồn assistant. Hội thoại dựng thẳng ở DB (pipeline kênh đã kiểm ở inbox test).
// Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let mine: string;
let other: string;

beforeAll(async () => {
  m = await matrix('conversation.search');
  lan = (await m.seed('contact.create', { full_name: 'Nguyễn Thị Lan', phone: '0901000111' })).contact_id;
  const db = await m.db();
  const acc = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web', status: 'connected' } });
  const conv = async (title: string, o: { contactId?: string; assignee?: string } = {}) => {
    const id = uuidv7();
    m.h.clock.advance(1000);
    await db.conversation.create({
      data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, title, contactId: o.contactId ?? null, assigneeUserId: o.assignee ?? null, lastMessageAt: m.h.clock.now() },
    });
    return id;
  };
  other = await conv('Hỏi giá liệu trình', { contactId: lan });
  mine = await conv('Anh Minh đặt lịch', { assignee: m.sales.id });
}, 120_000);
afterAll(() => m?.close());

const ids = (r: { body: { data: { result: { conversations: { id: string }[] } } } }) => r.body.data.result.conversations.map((c) => c.id);

describe('conversation.search', () => {
  it('happy: bỏ dấu, lọc theo khách / kênh', async () => {
    const r = await m.act({ q: 'minh dat lich' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(ids(r)).toEqual([mine]);
    expect((await m.act({ contact_id: lan })).body.data.result.conversations).toEqual([expect.objectContaining({ id: other, contact_id: lan, channel: 'webchat' })]);
    expect(ids(await m.act({ channel: 'email' }))).toEqual([]);
  });

  it('403: kế toán không có inbox.view', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: sales own chỉ thấy hội thoại mình phụ trách', async () => {
    expect(ids(await m.act({}, m.sales))).toEqual([mine]);
    expect(ids(await m.act({ contact_id: lan }, m.sales))).toEqual([]);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
