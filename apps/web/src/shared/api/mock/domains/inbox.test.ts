import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createInboxState } from './inbox';

type List = { data: { id: string; unread: number; channel: string }[]; next_cursor: null };
type Thread = { data: { id: string; kind: string; body?: string }[] };

describe('mock inbox', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().inbox = createInboxState();
  });

  it('danh sách chỉ gồm kênh phát hành và lọc theo kênh', async () => {
    const all = await mockTransport.get<List>('/conversations');
    expect(new Set(all.data.map((c) => c.channel))).toEqual(new Set(['zalo_personal', 'webchat', 'email']));
    const email = await mockTransport.get<List>('/conversations', { channel: 'email' });
    expect(email.data.every((c) => c.channel === 'email')).toBe(true);
  });

  it('message.send chèn tin trước "đang soạn"', async () => {
    await mockTransport.action('message.send', { conversation_id: 'c_lan', text: 'Chào chị' });
    const t = await mockTransport.get<Thread>('/conversations/c_lan/messages');
    const at = t.data.findIndex((m) => m.body === 'Chào chị');
    expect(t.data[at + 1]?.kind).toBe('typing');
  });

  it('archive có hoàn tác', async () => {
    const res = await mockTransport.action('conversation.archive', { conversation_id: 'c_lan' });
    expect((await mockTransport.get<List>('/conversations')).data.some((c) => c.id === 'c_lan')).toBe(false);
    if (res.status === 200) await mockTransport.undo(res.data.action_log_id);
    expect((await mockTransport.get<List>('/conversations')).data.some((c) => c.id === 'c_lan')).toBe(true);
  });

  it('mark_read xoá số chưa đọc', async () => {
    await mockTransport.action('conversation.mark_read', { conversation_id: 'c_lan' });
    const conv = await mockTransport.get<{ unread: number }>('/conversations/c_lan');
    expect(conv.unread).toBe(0);
  });

  it('Kế toán không có inbox.reply → FORBIDDEN', async () => {
    setMockRole('accountant');
    await expect(mockTransport.action('message.send', { conversation_id: 'c_lan', text: 'x' })).rejects.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });
});
