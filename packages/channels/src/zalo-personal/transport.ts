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

export interface ZaloSession {
  readonly ownId: string;
  onMessage(cb: (m: ZaloRawMessage) => void): void;
  onOldMessages(cb: (ms: ZaloRawMessage[]) => void): void;
  onClosed(cb: (code: number, reason: string) => void): void;
  start(): void;
  stop(): void;
  requestOldMessages(): void;
  sendText(threadId: string, isGroup: boolean, msg: string, styles: ZaloStyle[]): Promise<string>;
  sendFiles(threadId: string, isGroup: boolean, text: string, files: ZaloFile[]): Promise<string>;
  sendSticker(threadId: string, isGroup: boolean, sticker: { id: number; cateId: number; type: number }): Promise<string>;
  /** Tạo nhóm (zca-js `createGroup`) — trả id nhóm + uid thêm được / không thêm được. */
  createGroup(name: string, members: string[]): Promise<{ groupId: string; added: string[]; failed: string[] }>;
}

export interface ZaloTransport {
  /** QR → quét → credential + hồ sơ. `hint` = id tài khoản (bản giả dựng uid ổn định từ đó). Huỷ bằng `signal`. */
  loginQR(onEvent: (e: LoginEvent) => void, signal: AbortSignal, hint: string): Promise<{ credentials: ZaloCredentials; profile: ZaloProfile }>;
  /** Đăng nhập bằng credential đã lưu; sai / hết hạn → ChannelAuthError. */
  login(credentials: ZaloCredentials): Promise<ZaloSession>;
}
