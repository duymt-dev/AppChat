// Cổng thao tác Zalo cá nhân (TIP-014b A) trên ZaloSession — chỉ map các hàm SDK đã kiểm (provider-capabilities.md). Mọi lệnh kiểm
// tham chiếu TRƯỚC khi gọi kênh: thiếu cliMsgId → pending_ref, id không an toàn → unsafe_ref, không có phiên → ChannelNotRunningError.
// Sự kiện kênh (self-listen / thu hồi / cảm xúc) → ProviderEvent cho core; không đi qua pipeline tin khách.
import { ChannelOperationError, type ChannelOperations, type GroupLink, type ProviderEvent, type ProviderMessageRef, type ReactionEmoji } from '../operations';
import { ChannelNotRunningError } from '../types';
import { ZALO_REACTION, ZALO_REACTION_NONE, assertCallable, emojiOfZalo } from './provider-refs';
import type { ZaloRawMessage, ZaloRawReaction, ZaloRawUndo, ZaloSession } from './transport';

/** Số thành viên tối đa mỗi lần thêm (025b: ≤ 50 định danh đã biết). */
export const MAX_ADD_MEMBERS = 50;

const iso = (ts: string) => {
  const n = Number(ts);
  return new Date(Number.isFinite(n) && n > 0 ? n : 0).toISOString();
};

/** Self-event → tham chiếu tin ra (chỉ khi có cliMsgId). Key ổn định theo msgId (event lặp lại không xử lý hai lần). */
export function selfRefEvent(accountId: string, m: ZaloRawMessage): ProviderEvent | null {
  if (!m.isSelf || !m.cliMsgId) return null;
  return { kind: 'self_ref', accountId, key: `self:${m.msgId}`, ref: { threadId: m.threadId, isGroup: m.isGroup, msgId: m.msgId, cliMsgId: m.cliMsgId, senderId: m.uidFrom }, at: iso(m.ts) };
}

export function undoEvent(accountId: string, u: ZaloRawUndo): ProviderEvent {
  return { kind: 'recalled', accountId, key: `undo:${u.msgId}`, threadId: u.threadId, isGroup: u.isGroup, msgId: u.msgId, actorId: u.uidFrom, self: u.isSelf, at: iso(u.ts) };
}

/** Cảm xúc ngoài 6 emoji AppChat → null (bỏ qua, không ghi đè cảm xúc đang có). */
export function reactionEvent(accountId: string, r: ZaloRawReaction): ProviderEvent | null {
  const emoji = emojiOfZalo(r.icon);
  if (emoji === undefined) return null;
  return { kind: 'reaction', accountId, key: `react:${r.uidFrom}:${r.msgIds.join(',')}:${r.ts}`, threadId: r.threadId, isGroup: r.isGroup, msgIds: r.msgIds, actorId: r.uidFrom, self: r.isSelf, emoji, at: iso(r.ts) };
}

export function zaloOperations(session: (accountId: string) => ZaloSession): ChannelOperations {
  const live = (accountId: string) => {
    const s = session(accountId);
    if (!s) throw new ChannelNotRunningError(accountId);
    return s;
  };
  return {
    async recall(accountId: string, ref: ProviderMessageRef) {
      const id = assertCallable(ref);
      await live(accountId).undo(ref.threadId, ref.isGroup, id.msgId, id.cliMsgId);
    },
    async setReaction(accountId: string, ref: ProviderMessageRef, emoji: ReactionEmoji | null) {
      const id = assertCallable(ref);
      const icon = emoji === null ? ZALO_REACTION_NONE : ZALO_REACTION[emoji];
      if (icon === undefined) throw new ChannelOperationError('invalid', 'emoji');
      await live(accountId).react(ref.threadId, ref.isGroup, id.msgId, id.cliMsgId, icon);
    },
    async groupInfo(accountId: string, groupId: string) {
      const g = await live(accountId).groupInfo(groupId);
      // Danh sách id SDK trả có thể thiếu so với tổng — đánh dấu complete=false, không coi số quan sát là toàn bộ.
      const complete = g.totalMember !== null && g.memberIds.length >= g.totalMember;
      return { groupId: g.groupId, name: g.name, totalMembers: g.totalMember, memberIds: g.memberIds, complete };
    },
    async groupMembers(accountId: string, memberIds: string[]) {
      if (!memberIds.length) return [];
      const ms = await live(accountId).groupMembers(memberIds);
      return ms.map((m) => ({ id: m.id, displayName: m.displayName, ...(m.avatar ? { avatarUrl: m.avatar } : {}) }));
    },
    async groupLink(accountId: string, groupId: string): Promise<GroupLink> {
      const l = await live(accountId).groupLink(groupId);
      return { enabled: l.enabled, url: l.enabled ? l.link : null, expiresAt: l.expiresAt ? new Date(l.expiresAt).toISOString() : null };
    },
    async addGroupMembers(accountId: string, groupId: string, memberIds: string[]) {
      const ids = [...new Set(memberIds)];
      if (!ids.length || ids.length > MAX_ADD_MEMBERS) throw new ChannelOperationError('invalid', 'members');
      const r = await live(accountId).addUserToGroup(groupId, ids);
      const failed = new Set(r.failed.map((f) => f.id));
      return { added: ids.filter((id) => !failed.has(id)), failed: r.failed };
    },
  };
}
