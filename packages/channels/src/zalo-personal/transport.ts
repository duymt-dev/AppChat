// Cổng giao vận Zalo cá nhân: adapter chỉ nói chuyện với interface này. Bản thật bọc zca-js (zca-transport.ts — nơi
// DUY NHẤT import SDK, omnichannel-adapter §1); bản giả (fake-transport.ts) cho test / e2e khi chưa có tài khoản Zalo (Q-003).
import type { LoginEvent } from '../types';

/** Credential đăng nhập lại (Blueprint §6: cookie + imei + userAgent) — worker mã hoá vào `credentials_enc`. */
export interface ZaloCredentials {
  imei: string;
  cookie: unknown;
  userAgent: string;
  language?: string;
}

export interface ZaloProfile {
  id: string;
  name: string;
  phone?: string;
}

/** Tin thô đã rút gọn từ `Message` của zca-js (models/Message.d.ts) — normalize.ts chuyển sang NormalizedInbound. */
export interface ZaloRawMessage {
  isGroup: boolean;
  isSelf: boolean;
  threadId: string;
  msgId: string;
  /** Id phía client của tin (zca-js `TMessage.cliMsgId`) — cần cho thu hồi / cảm xúc (TIP-014b). */
  cliMsgId?: string;
  uidFrom: string;
  dName?: string;
  /** epoch ms dạng chuỗi */
  ts: string;
  /** `webchat` (chữ) · `chat.photo` · `share.file` · `chat.sticker` · `chat.voice` · `chat.link` … */
  msgType: string;
  content: unknown;
  mentions?: { uid: string }[];
}

/** Đoạn kiểu chữ Zalo (TextStyle của zca-js: b / i / s). */
export interface ZaloStyle {
  start: number;
  len: number;
  st: 'b' | 'i' | 's';
}

export interface ZaloFile {
  data: Buffer;
  filename: string;
}

/** Mã đóng của listener (zca-js CloseReason): 3000 mở phiên nơi khác, 3003 bị đá → hết phiên. */
export const ZALO_CLOSE = { manual: 1000, abnormal: 1006, duplicate: 3000, kick: 3003 } as const;

/** Tin bị thu hồi (zca-js `undo` — TUndo.content: globalMsgId / cliMsgId của tin GỐC). */
export interface ZaloRawUndo {
  isGroup: boolean;
  isSelf: boolean;
  threadId: string;
  uidFrom: string;
  /** msgId của tin gốc bị thu hồi (chuỗi số — đã kiểm an toàn). */
  msgId: string;
  ts: string;
}

/** Cảm xúc (zca-js `reaction` — TReaction.content.rMsg[].gMsgID, rIcon). */
export interface ZaloRawReaction {
  isGroup: boolean;
  isSelf: boolean;
  threadId: string;
  uidFrom: string;
  msgIds: string[];
  /** Mã `Reactions` của SDK ("" = gỡ). */
  icon: string;
  ts: string;
}

/** Đã nhận / đã xem (zca-js `delivered_messages` / `seen_messages`). Nhóm: `uids` = người có bằng chứng. */
export interface ZaloRawReceipt {
  kind: 'delivered' | 'seen';
  isGroup: boolean;
  threadId: string;
  msgIds: string[];
  uids: string[];
  ts: string;
}

export interface ZaloGroupInfo {
  groupId: string;
  name: string;
  totalMember: number | null;
  memberIds: string[];
}

export interface ZaloSession {
  readonly ownId: string;
  onMessage(cb: (m: ZaloRawMessage) => void): void;
  /** Tin do chính tài khoản gửi (self-listen) — chỉ để lấy cliMsgId, không vào pipeline tin khách. */
  onSelfMessage(cb: (m: ZaloRawMessage) => void): void;
  onUndo(cb: (u: ZaloRawUndo) => void): void;
  onReaction(cb: (r: ZaloRawReaction) => void): void;
  onReceipt(cb: (r: ZaloRawReceipt) => void): void;
  /** Một trang `old_messages` của đúng loại thread (1-1 / nhóm) — trả hàm huỷ đăng ký (TIP-014b C). */
  onOldMessagesOnce(isGroup: boolean, cb: (ms: ZaloRawMessage[]) => void): () => void;
  onClosed(cb: (code: number, reason: string) => void): void;
  start(): void;
  stop(): void;
  /** zca-js `requestOldMessages(type, lastId)` — trang lùi từ `lastId` (null = mới nhất). */
  requestOldMessages(isGroup: boolean, lastId: string | null): void;
  sendText(threadId: string, isGroup: boolean, msg: string, styles: ZaloStyle[]): Promise<string>;
  sendFiles(threadId: string, isGroup: boolean, text: string, files: ZaloFile[]): Promise<string>;
  sendSticker(threadId: string, isGroup: boolean, sticker: { id: number; cateId: number; type: number }): Promise<string>;
  /** Tạo nhóm (zca-js `createGroup`) — trả id nhóm + uid thêm được / không thêm được. */
  createGroup(name: string, members: string[]): Promise<{ groupId: string; added: string[]; failed: string[] }>;
  /** zca-js `undo({ msgId, cliMsgId }, threadId, type)`. Lỗi nhà cung cấp → ChannelOperationError('rejected'). */
  undo(threadId: string, isGroup: boolean, msgId: string, cliMsgId: string): Promise<void>;
  /** zca-js `addReaction(icon, { data: { msgId, cliMsgId }, threadId, type })` — icon "" = gỡ (Reactions.NONE). */
  react(threadId: string, isGroup: boolean, msgId: string, cliMsgId: string, icon: string): Promise<void>;
  groupInfo(groupId: string): Promise<ZaloGroupInfo>;
  /** zca-js `getGroupMembersInfo(memberIds)` — nhận id THÀNH VIÊN (lấy từ groupInfo), không nhận id nhóm. */
  groupMembers(memberIds: string[]): Promise<{ id: string; displayName: string; avatar?: string }[]>;
  /** zca-js `getUserInfo(ids, AvatarSize.Small)` — hồ sơ công khai theo lô (TIP-014b D: ảnh đại diện). */
  userInfo(ids: string[]): Promise<{ id: string; displayName: string; avatar?: string }[]>;
  /** zca-js `getAllFriends(count, page, AvatarSize.Small)` — danh bạ theo trang (TIP-014b D3). */
  friends(page: number, count: number): Promise<{ id: string; displayName: string; phone?: string; avatar?: string }[]>;
  /** zca-js `getGroupLinkDetail` — có thể đang tắt / không có link; bật link là thao tác riêng (không làm ở đây). */
  groupLink(groupId: string): Promise<{ enabled: boolean; link: string | null; expiresAt: number | null }>;
  /** zca-js `addUserToGroup` — có thể thành công một phần (errorMembers / error_data). */
  addUserToGroup(groupId: string, memberIds: string[]): Promise<{ failed: { id: string; error: string }[] }>;
}

export interface ZaloTransport {
  /** QR → quét → credential + hồ sơ. `hint` = id tài khoản (bản giả dựng uid ổn định từ đó). Huỷ bằng `signal`. */
  loginQR(onEvent: (e: LoginEvent) => void, signal: AbortSignal, hint: string): Promise<{ credentials: ZaloCredentials; profile: ZaloProfile }>;
  /** Đăng nhập bằng credential đã lưu; sai / hết hạn → ChannelAuthError. */
  login(credentials: ZaloCredentials): Promise<ZaloSession>;
}
