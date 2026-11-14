// Callback Brevo (hợp đồng tenant-mail-contract.json → webhook): Brevo KHÔNG ký HMAC; kết nối dùng `auth {type:'bearer', token}` khi tạo
// webhook → header `Authorization: Bearer <secrets.webhook_token>` (bí mật riêng, KHÔNG phải api_key). So sánh hằng thời gian trên byte
// gốc TRƯỚC khi parse. Thân ≤ 256 KiB, ≤ 1000 sự kiện (đơn hoặc lô). `id` của Brevo là id webhook, không phải id sự kiện → khoá chống lặp
// = message-id + event + ts_epoch (ms; thiếu → ts_event / ts giây) + digest người nhận.
import { timingSafeEqual } from 'node:crypto';
import type { ConnectionCtx, WebhookRequest } from '../../types';
import type { MailEvent, MailEventType } from '../../ports/tenant-mail';
import { recipientDigest } from '../../tenant-mail-validation';

export const CALLBACK_MAX_BYTES = 256 * 1024;
export const CALLBACK_MAX_EVENTS = 1000;

const TYPES: Record<string, MailEventType> = {
  delivered: 'delivered',
  deferred: 'deferred',
  soft_bounce: 'soft_bounce',
  hard_bounce: 'hard_bounce',
  spam: 'complaint',
  opened: 'opened',
  unique_opened: 'opened',
  proxy_open: 'opened',
  unique_proxy_open: 'opened',
  click: 'clicked',
  unsubscribed: 'unsubscribed',
  blocked: 'blocked',
  invalid_email: 'invalid',
  error: 'error',
};

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Bearer đúng token webhook của kết nối (hoặc token đã lưu riêng cho callback muộn sau ngắt kết nối). */
export function brevoAuthentic(token: string | undefined, req: WebhookRequest): boolean {
  const h = req.headers.authorization ?? '';
  return !!token && token.length >= 16 && h.slice(0, 7).toLowerCase() === 'bearer ' && same(h.slice(7).trim(), token);
}

function one(x: unknown): MailEvent | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const e = x as Record<string, unknown>;
  const type = typeof e.event === 'string' ? TYPES[e.event] : undefined;
  const ref = e['message-id'];
  const email = e.email;
  if (!type || typeof ref !== 'string' || !/^<[^<>\s]{3,250}>$/.test(ref) || typeof email !== 'string' || email.length > 254) return null;
  const ms = typeof e.ts_epoch === 'number' ? e.ts_epoch : typeof e.ts_event === 'number' ? e.ts_event * 1000 : typeof e.ts === 'number' ? e.ts * 1000 : NaN;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const digest = recipientDigest(email);
  return { key: `${ref}|${e.event as string}|${ms}|${digest.slice(0, 16)}`, type, providerMessageRef: ref, recipientDigest: digest, occurredAt: new Date(ms).toISOString() };
}

/** Xác thực + chuẩn hoá; sai xác thực / quá cỡ → null (từ chối đồng nhất); sự kiện không nhận diện được bị bỏ (đếm ở core). */
export function parseBrevoEvents(conn: ConnectionCtx, req: WebhookRequest): MailEvent[] | null {
  if (Buffer.byteLength(req.rawBody) > CALLBACK_MAX_BYTES) return null;
  if (!brevoAuthentic(conn.secrets.webhook_token, req)) return null;
  let v: unknown;
  try {
    v = JSON.parse(req.rawBody);
  } catch {
    return [];
  }
  const list = Array.isArray(v) ? v : [v];
  if (list.length > CALLBACK_MAX_EVENTS) return null;
  return list.map(one).filter((x): x is MailEvent => !!x);
}
