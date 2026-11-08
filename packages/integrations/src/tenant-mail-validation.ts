// Kiểm cấu hình / thư mail tenant (TIP-012c §1.2): chặn CRLF / ký tự điều khiển (chèn header), địa chỉ sai, cổng / TLS ngoài 465 / 587,
// giới hạn tiêu đề ≤ 200, văn bản ≤ 4000 (trước dựng), MIME đã dựng ≤ 1 MiB. Không nhận header / BCC / envelope / tuỳ chọn transport tuỳ ý.
import { createHash } from 'node:crypto';
import type { TenantMailMessage } from './ports/tenant-mail';

export const SUBJECT_MAX = 200;
export const TEXT_MAX = 4000;
export const MIME_MAX = 1024 * 1024;
const CTRL = /[\u0000-\u001f\u007f]/;
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const validEmail = (v: string) => v.length <= 254 && !CTRL.test(v) && EMAIL.test(v);
export const safeHeaderText = (v: string, max: number) => v.length <= max && !CTRL.test(v);
/** Email chuẩn hoá (chữ thường, bỏ khoảng trắng) → sha256 hex — khoá ghép callback không lưu địa chỉ. */
export const recipientDigest = (email: string) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

export type SmtpTls = 'implicit' | 'starttls';

/** Lỗi theo trường (không lộ giá trị) — dùng trong manifest.validate. */
export function mailConfigErrors(cfg: Record<string, string>, kind: 'brevo' | 'smtp'): Record<string, string> | null {
  const e: Record<string, string> = {};
  if (!cfg.sender_email || !validEmail(cfg.sender_email)) e.sender_email = 'invalid';
  if (cfg.sender_name !== undefined && !safeHeaderText(cfg.sender_name, 100)) e.sender_name = 'invalid';
  if (cfg.reply_to && !validEmail(cfg.reply_to)) e.reply_to = 'invalid';
  if (kind === 'smtp') {
    const host = (cfg.host ?? '').trim().toLowerCase();
    if (!HOST.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host)) e.host = 'invalid';
    if (!['465', '587'].includes(cfg.port ?? '')) e.port = 'invalid';
    if (cfg.tls && cfg.tls !== tlsFor(cfg.port ?? '')) e.tls = 'invalid';
    if (!cfg.username || !safeHeaderText(cfg.username, 254)) e.username = 'invalid';
  }
  return Object.keys(e).length ? e : null;
}

/** 465 = TLS ngầm, 587 = STARTTLS bắt buộc; cổng khác không hỗ trợ. */
export const tlsFor = (port: string): SmtpTls | null => (port === '465' ? 'implicit' : port === '587' ? 'starttls' : null);

/** Thư đã dựng hợp lệ để gửi; sai → mã lỗi (không gửi). */
export function messageError(m: TenantMailMessage): string | null {
  if (!validEmail(m.to)) return 'to';
  if (!safeHeaderText(m.subject, SUBJECT_MAX) || !m.subject.trim()) return 'subject';
  if (!/^<[^<>\s\u0000-\u001f]{3,250}>$/.test(m.messageId)) return 'message_id';
  if (!/^[a-z0-9_-]{1,40}$/.test(m.tag)) return 'tag';
  if (m.listUnsubscribe !== undefined && (!/^https:\/\/[^\s<>]{1,500}$/.test(m.listUnsubscribe) || CTRL.test(m.listUnsubscribe))) return 'list_unsubscribe';
  if (Buffer.byteLength(m.html) + Buffer.byteLength(m.text) + Buffer.byteLength(m.subject) > MIME_MAX) return 'size';
  return null;
}
