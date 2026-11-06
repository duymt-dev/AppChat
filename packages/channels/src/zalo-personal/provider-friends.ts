// Bạn bè Zalo cá nhân (TIP-014b E) trên ZaloSession: id người dùng phải là chuỗi số an toàn (không gọi kênh với id hỏng); lời nhắn ≤ 150 ký
// tự; tra SĐT nhận đúng một số di động VN đã chuẩn hoá. Sự kiện `friend_event` của zca-js → FriendEvent cho core (chỉ loại có nghĩa).
import { ChannelOperationError } from '../operations';
import { ChannelNotRunningError } from '../types';
import { FRIEND_MESSAGE_MAX, type ChannelFriends, type FriendEvent } from '../friends';
import { safeForSdk } from './provider-refs';
import type { ZaloRawFriendEvent, ZaloSession } from './transport';

const PHONE = /^0[35789][0-9]{8}$/;

const iso = (ts: string) => {
  const n = Number(ts);
  return new Date(Number.isFinite(n) && n > 0 ? n : 0).toISOString();
};

/** Sự kiện kênh → FriendEvent (key ổn định theo loại + người + mốc). Loại khác (chặn, ghim…) → null. */
export function friendEvent(accountId: string, e: ZaloRawFriendEvent): FriendEvent | null {
  if (!e.userId || !safeForSdk(e.userId)) return null;
  return { kind: 'friend', type: e.type, accountId, key: `friend:${e.type}:${e.userId}:${e.ts}`, userId: e.userId, self: e.isSelf, ...(e.message ? { message: e.message.slice(0, FRIEND_MESSAGE_MAX) } : {}), at: iso(e.ts) };
}

export function zaloFriends(session: (accountId: string) => ZaloSession | undefined): ChannelFriends {
  const live = (accountId: string) => {
    const s = session(accountId);
    if (!s) throw new ChannelNotRunningError(accountId);
    return s;
  };
  const uid = (id: string) => {
    if (!safeForSdk(id)) throw new ChannelOperationError('unsafe_ref', 'user_id');
    return id;
  };
  return {
    accept: async (a, id) => live(a).acceptFriend(uid(id)),
    reject: async (a, id) => live(a).rejectFriend(uid(id)),
    async send(a, id, message) {
      const msg = message.trim();
      if (msg.length > FRIEND_MESSAGE_MAX) throw new ChannelOperationError('invalid', 'message');
      await live(a).sendFriendRequest(uid(id), msg);
    },
    undo: async (a, id) => live(a).undoFriendRequest(uid(id)),
    status: async (a, id) => live(a).friendStatus(uid(id)),
    async findUser(a, phone) {
      if (!PHONE.test(phone)) throw new ChannelOperationError('invalid', 'phone');
      const u = await live(a).findUser(phone);
      return u && u.id && safeForSdk(u.id) ? { id: u.id, displayName: u.displayName || u.id, ...(u.avatar ? { avatarUrl: u.avatar } : {}) } : null;
    },
  };
}
