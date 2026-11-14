// Port `mail` của DOANH NGHIỆP (TIP-012c §1): Brevo / SMTP gắn vào kết nối tenant (ConnectionCtx — khoá đã giải mã, chỉ trong bộ nhớ).
// Tách hẳn ports/mail.ts (thư hệ thống của nền tảng — OTP / mời — cấu hình env) và kênh Email của Hộp thư (channel_account). Mọi lệnh nhận
// đúng ConnectionCtx của lượt gọi; adapter không giữ khoá toàn cục, không lùi live → mock. HTTP / SMTP đều do core TIÊM (MailTransports):
// Brevo qua safeFetch (host cố định), SMTP qua kết nối đã ghim IP — package này không tự mở mạng.
//
// Kết quả gửi TRUNG THỰC: `accepted` chỉ khi provider trả mã thư không rỗng VÀ bằng chứng người nhận được nhận; mất phản hồi sau khi có thể
// đã nhận → `unknown` (không tự gửi lại); chắc chắn chưa nhận → `failed_before_accept` (`retryable` khi lỗi tạm). Nhận ≠ đã giao.
import type { ConnectorAdapter, ConnectionCtx, WebhookRequest } from '../types';
import type { ProviderHttpResponse } from '../provider-http';

/** Thư đã dựng từ nội dung chiến dịch ĐÃ DUYỆT (core) — không có header / BCC / đính kèm / envelope tuỳ ý. */
export interface TenantMailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Message-ID do core sinh (ổn định theo lượt gửi) — SMTP dùng làm tham chiếu; Brevo trả mã riêng. */
  messageId: string;
  /** Nhãn không PII (vd. `campaign`) — gắn tag Brevo / header X-AppChat-Tag. */
  tag: string;
  /** Header List-Unsubscribe (URL ký của chiến dịch) — chỉ giá trị https đã kiểm. */
  listUnsubscribe?: string;
}

export type SendOutcome =
  | { state: 'accepted'; providerMessageRef: string; evidence: string }
  | { state: 'failed_before_accept'; retryable: boolean; reason: string; retryAfterS?: number }
  | { state: 'unknown'; reason: string };

/** Trạng thái người gửi (không đồng nhất "kết nối được" với "đã giao"). */
export type SenderState = 'configured' | 'unverified' | 'authenticated_transport' | 'sender_verified' | 'unsupported' | 'degraded';

export interface SenderCapability {
  /** Định danh người gửi ổn định trong kết nối (Brevo: id sender; SMTP: `configured`). */
  id: string;
  email: string;
  name: string;
  state: SenderState;
}

export interface TenantMailProbe {
  state: SenderState;
  /** Định danh tài khoản provider (không bí mật) — gắn biên nhận / callback (Brevo: chưa có trong tài liệu → null). */
  accountRef: string | null;
  senders: SenderCapability[];
  /** Sự kiện giao / mở / nhấp provider hỗ trợ (SMTP: không). */
  events: boolean;
  reason?: string;
}

/** Sự kiện giao thư đã xác thực + chuẩn hoá (≤ 1000 / request). `key` = khoá chống lặp theo hợp đồng provider. */
export type MailEventType = 'delivered' | 'deferred' | 'soft_bounce' | 'hard_bounce' | 'complaint' | 'opened' | 'clicked' | 'unsubscribed' | 'blocked' | 'invalid' | 'error';
export interface MailEvent {
  key: string;
  type: MailEventType;
  providerMessageRef: string;
  /** sha256 hex của email người nhận đã chuẩn hoá (không lưu địa chỉ). */
  recipientDigest: string;
  occurredAt: string;
}

/** Cầu mạng core tiêm vào (safeFetch / SMTP ghim IP). */
export interface MailTransports {
  /** POST / GET JSON tới host provider cố định (core chặn host lạ, redirect, trần byte, timeout). */
  http(req: { method: 'GET' | 'POST'; url: string; headers: Record<string, string>; body?: string }): Promise<ProviderHttpResponse>;
  /** SMTP: core trả transport đã ghim IP + TLS bắt buộc cho đúng cấu hình kết nối. */
  smtp?(conn: ConnectionCtx): Promise<SmtpSend>;
}

export interface SmtpSendInfo {
  accepted: string[];
  rejected: string[];
  response: string;
  messageId: string;
}
export type SmtpSend = (mail: { from: { address: string; name: string }; replyTo?: string; to: string; subject: string; html: string; text: string; messageId: string; headers: Record<string, string> }) => Promise<SmtpSendInfo>;

export interface TenantMailProvider extends ConnectorAdapter {
  readonly tenantMail: true;
  /** Thăm dò KHÔNG gửi thư: khoá / đăng nhập + danh sách người gửi + trạng thái xác minh. */
  probe(conn: ConnectionCtx, t: MailTransports): Promise<TenantMailProbe>;
  send(conn: ConnectionCtx, t: MailTransports, msg: TenantMailMessage): Promise<SendOutcome>;
  /** Xác thực + chuẩn hoá callback (byte gốc) — sai → null; payload hỏng → []. SMTP: không hỗ trợ. */
  parseEvents?(conn: ConnectionCtx, req: WebhookRequest): MailEvent[] | null;
}

export const isTenantMail = (a: unknown): a is TenantMailProvider => !!a && (a as { tenantMail?: unknown }).tenantMail === true;
