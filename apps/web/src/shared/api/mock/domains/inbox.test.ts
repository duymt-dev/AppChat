import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { conversationsPageSchema, folderCountsSchema } from '@appchat/shared';
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

  it('mock nhận cùng tham số với API: thư mục / tài khoản / tìm không dấu / chưa đọc trước / cursor; khớp schema', async () => {
    const page = conversationsPageSchema.parse(await mockTransport.get('/conversations', { folder: 'unread' }));
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data.every((c) => c.unread > 0)).toBe(true);
    expect((await mockTransport.get<List>('/conversations', { folder: 'needs_human' })).data.map((c) => c.id)).toEqual(['c_hieu']);
    expect((await mockTransport.get<List>('/conversations', { q: 'nhom vip' })).data.map((c) => c.id)).toContain('g_vip');
    const acc = (await mockTransport.get<List>('/conversations', { channel_account_id: 'a9' })).data;
    expect(acc.length).toBeGreaterThan(0);
    expect(acc.every((c) => c.channel === 'email')).toBe(true);
    const sorted = (await mockTransport.get<List>('/conversations', { sort: 'unread' })).data;
    const firstRead = sorted.findIndex((c) => c.unread === 0);
    expect(sorted.slice(firstRead).every((c) => c.unread === 0)).toBe(true);
    expect((await mockTransport.get<List>('/conversations', { cursor: '50' })).data).toEqual([]);
  });

  it('ghi chú @nhắc → thư mục "Nhắc đến tôi" + đếm; mark_read → hết; dịch có tiền tố ngôn ngữ', async () => {
    await mockTransport.action('note.add', { conversation_id: 'c_mai', text: '@Minh xem giúp', mentions: ['u_minh'] });
    expect((await mockTransport.get<List>('/conversations', { folder: 'mention' })).data.map((c) => c.id)).toEqual(['c_mai']);
    const counts = folderCountsSchema.parse(await mockTransport.get('/conversations/counts'));
    expect(counts.mailbox.find(([k]) => k === 'mention')?.[2]).toBe(5);
    await mockTransport.action('conversation.mark_read', { conversation_id: 'c_mai' });
    expect((await mockTransport.get<List>('/conversations', { folder: 'mention' })).data).toEqual([]);
    const r = await mockTransport.action<{ text: string }>('ai.translate', { conversation_id: 'c_lan', message_id: mockDb().inbox.messages.c_lan!.find((m) => m.direction === 'in')!.id, to: 'en' });
    expect(r.status === 200 && r.data.result.text).toMatch(/^\[EN\] /);
  });

  it('Kế toán không có inbox.reply → FORBIDDEN', async () => {
    setMockRole('accountant');
    await expect(mockTransport.action('message.send', { conversation_id: 'c_lan', text: 'x' })).rejects.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });
});
