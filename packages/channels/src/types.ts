// Hợp đồng kênh (standards/channels/omnichannel-adapter.md → Hợp đồng; Blueprint §6). Core chỉ biết các kiểu này.
import type { z } from 'zod';
import type { ChannelOperations, OperationCapabilities, ProviderEvent, ProviderMessageRef, SendLedger } from './operations';
import type { ChannelFriends } from './friends';

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
    /** Hiện hàng cảm xúc ở menu tin (OQ-12). Không suy ra năng lực gọi kênh — xem `operations.react`. */
    reactions: boolean;
    /** Năng lực từng thao tác (TIP-014b A): local / remote / unsupported — vắng = unsupported. */
    operations?: OperationCapabilities;
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
  /** Tham chiếu tin phía kênh (TIP-014b: Zalo msgId + cliMsgId) — core lưu `message_provider_ref` cho thu hồi / cảm xúc. */
  providerRef?: ProviderMessageRef;
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
  /** Sự kiện nhà cung cấp ngoài tin (TIP-014b: tham chiếu tin tự gửi, thu hồi, cảm xúc) — không đi qua pipeline tin vào. */
  event?(e: ProviderEvent): Promise<void>;
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

/** Yêu cầu lấy lịch sử (TIP-014b C): mốc cắt + trần trang / tin / thời gian chờ một trang. */
export interface HistoryRequest {
  cutoffAt: string;
  maxPages: number;
  maxMessages: number;
  pageTimeoutMs: number;
}

/**
 * Kết quả lịch sử: `complete` = đã chạm mốc cắt; `provider_limit` = nhà cung cấp hết dữ liệu trước mốc (không đủ khoảng yêu cầu);
 * `partial` = dừng ở trần trang / tin; `timeout` = một trang không về kịp. `received` = tin nhà cung cấp trả, `inRange` = tin trong khoảng.
 */
export interface HistoryReport {
  status: 'complete' | 'provider_limit' | 'partial' | 'timeout';
  received: number;
  inRange: number;
  pages: number;
  earliestAt: string | null;
  latestAt: string | null;
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
  /**
   * Lấy lịch sử có giới hạn (TIP-014b C — thay `syncHistory` cũ): tin trong khoảng [cutoffAt, nay] theo trang; mỗi lô chờ `onBatch` (core
   * lưu bền) rồi mới lấy trang sau. Không đẩy qua sink tin mới (lịch sử không kích luồng trực tiếp). Báo cáo trung thực khoảng thực thấy.
   */
  /** Bạn bè (TIP-014b E): lời mời kết bạn + tra SĐT — chỉ khi manifest khai `friend_requests` / `find_user`. */
  friends?: ChannelFriends;
  fetchHistory?(accountId: string, req: HistoryRequest, onBatch: (batch: NormalizedInbound[]) => Promise<void>): Promise<HistoryReport>;
  start?(account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;
  stop?(accountId: string): Promise<void>;
  handleWebhook?(req: RawWebhook, account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;
  /** `session = 'poll'` (email — TIP-018): tin mới từ mốc `cursor` (core lưu nguyên giá trị trả về, lần đầu `null`). */
  poll?(accountId: string, cursor: unknown, now?: Date): Promise<{ messages: NormalizedInbound[]; cursor: unknown }>;
  /** `externalMsgId` = id đại diện (tương thích cũ); `parts` = tham chiếu từng phần đã gửi theo thứ tự (TIP-014b) khi kênh có. */
  send(accountId: string, msg: OutboundMessage, ledger?: SendLedger): Promise<SendReceipt>;
  probe(accountId: string): Promise<HealthStatus>;
  /**
   * `capabilities.createGroup`: tạo nhóm với các id phía kênh đã biết. Chưa chạy phiên → ChannelNotRunningError TRƯỚC khi gọi nhà cung
   * cấp (an toàn để thử lại); lỗi khác có thể đã tạo nhóm phía kênh — core ghi `unknown`, không tự thử lại.
   */
  createGroup?(accountId: string, req: CreateGroupRequest): Promise<CreateGroupResult>;
  /** Thao tác ngoài gửi tin — chỉ hàm ứng với `manifest.capabilities.operations[kind] = 'remote'` (operations.ts). */
  operations?: ChannelOperations;
}

export interface SendReceipt {
  externalMsgId: string;
  parts?: ProviderMessageRef[];
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

/**
 * Tin chia nhiều phần: một số phần đã có ACK nhà cung cấp rồi lỗi (TIP-014b B). `receipt` = các phần đã gửi chắc chắn — core ghi
 * `partial`, KHÔNG gửi lại cả tin. `cause` = lỗi của phần kế tiếp.
 */
export class PartialSendError extends Error {
  constructor(
    readonly receipt: SendReceipt,
    override readonly cause: unknown,
  ) {
    super('channel_partial_send');
    this.name = 'PartialSendError';
  }
}
