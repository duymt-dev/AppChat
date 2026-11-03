// Hợp đồng kênh (standards/channels/omnichannel-adapter.md → Hợp đồng; Blueprint §6). Core chỉ biết các kiểu này.
import type { z } from 'zod';

export type ChannelStatus = 'ga' | 'beta' | 'coming_soon';
export type ConnectKind = 'qr' | 'oauth' | 'credentials' | 'webhook' | 'embed';
export type HealthStatus = 'connected' | 'degraded' | 'error' | 'expired';
export type SendKind = 'text' | 'image' | 'file' | 'sticker' | 'audio' | 'card' | 'template';

export interface ChannelManifest {
  type: string;
  /** i18n key `channels.<type>.label`. */
  label: string;
  /** Key icon trong packages/ui. */
  icon: string;
  group: 'chat' | 'social' | 'email' | 'sms' | 'web' | 'commerce';
  status: ChannelStatus;
  connect: { kind: ConnectKind; fields?: z.ZodObject; riskNotice?: string };
  capabilities: {
    direct: boolean;
    group: boolean;
    /** Tạo nhóm mới từ khách đã biết (TIP-023b SPEC D) — riêng với `group` (nhận / gửi tin nhóm); chỉ true khi adapter có `createGroup`. */
    createGroup?: boolean;
    mentions: boolean;
    reactions: boolean;
    send: SendKind[];
    maxTextLength: number;
    markdown: 'none' | 'rich' | 'html';
    proactive: 'allowed' | 'window_24h' | 'template_only' | 'disallowed';
  };
  rateLimit: { perMinute: number; perDayProactive?: number; jitterMs?: [number, number] };
  session: 'lease' | 'webhook' | 'poll';
  /** Hiển thị ở Cài đặt › Kênh kết nối (prototype L6141 — tên thương hiệu, ký hiệu logo, màu, nhóm, nhãn "Phổ biến" / "Beta"). */
  display: { name: string; short: string; color: string; group: 'msg' | 'web' | 'shop'; label: '' | 'pop' | 'beta'; sort: number };
}

export interface ChannelAccountRuntime {
  id: string;
  workspaceId: string;
  type: string;
  credentials: unknown;
  settings: Record<string, unknown>;
}

export interface NormalizedInbound {
  channelAccountId: string;
  externalThreadId: string;
  externalMsgId: string;
  isGroup: boolean;
  sender: { externalId: string; name?: string; avatarUrl?: string; phone?: string; email?: string };
  kind: 'text' | 'image' | 'file' | 'sticker' | 'audio';
  text?: string;
  attachments?: { url: string; mime: string; name?: string; size?: number }[];
  mentionsMe?: boolean;
  sentAt: string;
  raw: unknown;
}

export interface OutboundMessage {
  externalThreadId: string;
  /** Hội thoại nhóm (Zalo phân biệt thread 1-1 / nhóm khi gửi). */
  isGroup?: boolean;
  kind: SendKind;
  text?: string;
  attachments?: { url: string; mime: string; name?: string }[];
  replyToExternalMsgId?: string;
  /** `kind = 'sticker'`: mã sticker theo kênh (Zalo: id / cateId / type). */
  sticker?: Record<string, number>;
  /** Địa chỉ người nhận khi thread id không phải địa chỉ (email: thread = Message-ID gốc, người nhận = email khách). */
  externalThreadTo?: string;
  /** Dữ liệu riêng của kênh do core dựng (email: tiêu đề, In-Reply-To, References — TIP-018). */
  meta?: Record<string, unknown>;
}

export interface InboundSink {
  push(msg: NormalizedInbound): Promise<void>;
  /** Phiên đổi sức khoẻ ngoài ý muốn (hết phiên, bị đá, lỗi kết nối) — worker ghi `channel_account.status` + báo Owner. */
  status?(accountId: string, health: HealthStatus, detail?: string): void;
}

/** Sự kiện đăng nhập QR (Blueprint §6 Zalo cá nhân): ảnh QR (PNG base64) → đã quét → xong / hết hạn / từ chối. */
export type LoginEvent =
  | { type: 'qr'; image: string; expiresAt: string }
  | { type: 'scanned'; name?: string }
  | { type: 'expired' }
  | { type: 'declined' };

export interface LoginResult {
  /** Credential để đăng nhập lại (worker mã hoá vào `credentials_enc`, không log). */
  credentials: unknown;
  /** Id tài khoản phía kênh (uid Zalo) — unique theo `(type, external_id)`. */
  externalId: string;
  name: string;
}

export interface RawWebhook {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody?: Buffer;
}

export interface ChannelAdapter {
  manifest: ChannelManifest;
  /** `connect.kind = 'qr'`: phát QR qua `onEvent`, resolve khi quét xong; `signal` huỷ (hết giờ / người dùng bỏ). */
  beginLogin?(accountId: string, onEvent: (e: LoginEvent) => void, signal: AbortSignal): Promise<LoginResult>;
  /** Đồng bộ lại tin trong `days` ngày gần nhất (REQ-B11) — tin cũ đi vào sink như tin mới (chống trùng ở DB). */
  syncHistory?(accountId: string, days: number): Promise<void>;
  start?(account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;
  stop?(accountId: string): Promise<void>;
  handleWebhook?(req: RawWebhook, account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;
  /** `session = 'poll'` (email — TIP-018): tin mới từ mốc `cursor` (core lưu nguyên giá trị trả về, lần đầu `null`). */
  poll?(accountId: string, cursor: unknown, now?: Date): Promise<{ messages: NormalizedInbound[]; cursor: unknown }>;
  send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }>;
  probe(accountId: string): Promise<HealthStatus>;
  /**
   * `capabilities.createGroup`: tạo nhóm với các id phía kênh đã biết. Chưa chạy phiên → ChannelNotRunningError TRƯỚC khi gọi nhà cung
   * cấp (an toàn để thử lại); lỗi khác có thể đã tạo nhóm phía kênh — core ghi `unknown`, không tự thử lại.
   */
  createGroup?(accountId: string, req: CreateGroupRequest): Promise<CreateGroupResult>;
}

export interface CreateGroupRequest {
  name: string;
  /** Id phía kênh của thành viên (Zalo: uid) — chỉ định danh đã biết trên tài khoản này. */
  members: string[];
}

export interface CreateGroupResult {
  /** Id nhóm phía kênh = `external_thread_id` của hội thoại nhóm. */
  groupId: string;
  added: string[];
  failed: string[];
}

/** Một mục registry: manifest luôn có; adapter gắn khi TIP chủ kênh làm xong. */
export interface ChannelEntry {
  manifest: ChannelManifest;
  adapter?: ChannelAdapter;
}

/** Credential sai / hết hạn — worker chuyển tài khoản sang `expired` và báo quét lại (Blueprint §6). */
export class ChannelAuthError extends Error {
  constructor(message = 'channel_auth') {
    super(message);
    this.name = 'ChannelAuthError';
  }
}

/** Tài khoản không có phiên trong worker này (mất lease / chưa chạy) — job gửi thử lại sau. */
export class ChannelNotRunningError extends Error {
  constructor(accountId: string) {
    super(`channel_not_running:${accountId}`);
    this.name = 'ChannelNotRunningError';
  }
}
