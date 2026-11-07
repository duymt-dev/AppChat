// TIP-025b §D.1–2 — linkConversation: 1-1 lấy đúng khách của hội thoại; khác khách / chưa liên kết → 422 rõ (không âm thầm bỏ liên kết);
// nhóm cần khách chọn rõ là thành viên đã liên kết; tin nguồn thuộc hội thoại khác / đã thu hồi → 404; ngoài scope → 404; hội thoại agent
// đang phục vụ (server suy ra) không bắt scope người gọi; không có ngữ cảnh → giữ nguyên khách.
import { describe, expect, it } from 'vitest';
import type { AuthzContext } from '@appchat/shared';
import { linkConversation } from '../src/inbox/services/conversation-link';

const U = (n: number) => `0190f000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const D = U(1); // 1-1 khách K1
const G = U(2); // nhóm, thành viên K2
const N = U(3); // 1-1 chưa liên kết khách
const HID = U(4); // 1-1 ngoài scope
const M1 = U(10); // tin thuộc D
const M2 = U(11); // tin thuộc G
const MR = U(12); // tin D đã thu hồi
const K1 = U(20);
const K2 = U(21);
const me = U(99);

const convs: Record<string, object> = {
  [D]: { id: D, kind: 'direct', contactId: K1, assigneeUserId: me, teamId: null },
  [G]: { id: G, kind: 'group', contactId: null, assigneeUserId: me, teamId: null },
  [N]: { id: N, kind: 'direct', contactId: null, assigneeUserId: me, teamId: null },
  [HID]: { id: HID, kind: 'direct', contactId: K1, assigneeUserId: U(98), teamId: null },
};
const msgs: Record<string, object> = {
  [M1]: { id: M1, conversationId: D, deletedAt: null, recalledAt: null },
  [M2]: { id: M2, conversationId: G, deletedAt: null, recalledAt: null },
  [MR]: { id: MR, conversationId: D, deletedAt: null, recalledAt: new Date() },
};
const tx = {
  conversation: { findUnique: async ({ where }: { where: { id: string } }) => convs[where.id] ?? null },
  message: { findUnique: async ({ where }: { where: { id: string } }) => msgs[where.id] ?? null },
  conversationParticipant: { findFirst: async ({ where }: { where: { conversationId: string; contactId: string } }) => (where.conversationId === G && where.contactId === K2 ? { externalId: 'zl' } : null) },
  contact: { findUnique: async () => ({ ownerUserId: U(97) }) },
  contactCollaborator: { findUnique: async () => null, findFirst: async () => null },
} as never;
const authz = { userId: me, isOwner: false, permissions: new Set(), scope: { inbox: 'own' }, teamIds: [] } as unknown as AuthzContext;
const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string; httpStatus?: number }) => `${e.httpStatus}:${e.code}`);

describe('linkConversation', () => {
  it('không ngữ cảnh → giữ khách; 1-1 không chọn khách → khách của hội thoại', async () => {
    expect(await linkConversation(tx, authz, K2, {})).toEqual({ conversationId: null, messageId: null, contactId: K2 });
    expect(await linkConversation(tx, authz, undefined, { conversation_id: D })).toEqual({ conversationId: D, messageId: null, contactId: K1 });
  });

  it('tin nguồn suy ra hội thoại; khác khách / chưa liên kết → 422; tin hội thoại khác / thu hồi → 404', async () => {
    expect(await linkConversation(tx, authz, K1, { source_message_id: M1 })).toEqual({ conversationId: D, messageId: M1, contactId: K1 });
    expect(await code(linkConversation(tx, authz, K2, { conversation_id: D }))).toBe('422:VALIDATION_FAILED');
    expect(await code(linkConversation(tx, authz, K1, { conversation_id: N }))).toBe('422:VALIDATION_FAILED');
    expect(await code(linkConversation(tx, authz, K1, { conversation_id: D, source_message_id: M2 }))).toBe('404:NOT_FOUND');
    expect(await code(linkConversation(tx, authz, K1, { source_message_id: MR }))).toBe('404:NOT_FOUND');
  });

  it('nhóm: cần khách chọn rõ là thành viên đã liên kết', async () => {
    expect(await code(linkConversation(tx, authz, undefined, { conversation_id: G }))).toBe('422:VALIDATION_FAILED');
    expect(await code(linkConversation(tx, authz, K1, { conversation_id: G }))).toBe('422:VALIDATION_FAILED');
    expect(await linkConversation(tx, authz, K2, { source_message_id: M2 })).toEqual({ conversationId: G, messageId: M2, contactId: K2 });
  });

  it('ngoài scope → 404; hội thoại agent đang phục vụ (server) không bắt scope', async () => {
    expect(await code(linkConversation(tx, authz, K1, { conversation_id: HID }))).toBe('404:NOT_FOUND');
    expect((await linkConversation(tx, authz, K1, { conversation_id: HID }, { served: HID })).conversationId).toBe(HID);
    expect(await code(linkConversation(tx, authz, K1, { conversation_id: HID }, { served: D }))).toBe('404:NOT_FOUND');
  });
});
