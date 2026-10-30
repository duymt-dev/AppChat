// TIP-016: route mock Hộp thư đúng shape đọc dùng chung với API thật (packages/shared/src/api/inbox.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  cannedGroupsSchema,
  connectChannelsSchema,
  conversationSchema,
  conversationsPageSchema,
  folderCountsSchema,
  groupInfoSchema,
  inboxAccountsSchema,
  inboxChannelsSchema,
  messageSearchSchema,
  settingsRepliesSchema,
  settingsTagsSchema,
  tagOptionsSchema,
  threadSchema,
} from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createInboxState } from './domains/inbox';

const ok = (r: { success: boolean; error?: { issues: unknown[] } }) => expect(r.success ? [] : r.error!.issues).toEqual([]);

describe('mock inbox — shape FE ↔ BE', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().inbox = createInboxState();
  });

  it('danh sách, đếm, một hội thoại, tin, tìm trong hội thoại', async () => {
    ok(conversationsPageSchema.safeParse(await mockTransport.get('/conversations')));
    ok(folderCountsSchema.safeParse(await mockTransport.get('/conversations/counts')));
    ok(conversationSchema.safeParse(await mockTransport.get('/conversations/c_lan')));
    ok(threadSchema.safeParse(await mockTransport.get('/conversations/c_lan/messages')));
    const hits = await mockTransport.get('/conversations/c_lan/messages/search', { q: 'hifu', sender: 'contact' });
    ok(messageSearchSchema.safeParse(hits));
    expect((hits as unknown[]).length).toBeGreaterThan(0);
  });

  it('phụ trợ: tài khoản, kênh, kết nối, nhóm, câu trả lời mẫu, thẻ, cài đặt thẻ / câu trả lời mẫu', async () => {
    ok(inboxAccountsSchema.safeParse(await mockTransport.get('/inbox/accounts')));
    ok(inboxChannelsSchema.safeParse(await mockTransport.get('/inbox/channels')));
    ok(connectChannelsSchema.safeParse(await mockTransport.get('/inbox/connect-channels')));
    ok(groupInfoSchema.safeParse(await mockTransport.get('/groups/g_vip')));
    ok(cannedGroupsSchema.safeParse(await mockTransport.get('/canned-replies')));
    ok(tagOptionsSchema.safeParse(await mockTransport.get('/tags')));
    ok(settingsTagsSchema.safeParse(await mockTransport.get('/settings/tags')));
    ok(settingsRepliesSchema.safeParse(await mockTransport.get('/settings/replies')));
  });
});
