// Link huỷ nhận tin chiến dịch (TIP-037, REQ-I03): `<APP_PUBLIC_URL>/campaign/unsubscribe?t=<token>`; token =
// `<workspace>.<recipient>.<hạn base36>.<HMAC>` (HMAC-SHA256 theo khoá chủ APP_ENC_KEY, nhãn `unsub` riêng — không dùng lại được làm link
// báo giá / tệp). Chỉ mang id người nhận (không id khách tuỳ ý); hết hạn sau 180 ngày. Không log token. Sai / hết hạn → null (404 chung).
import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const UNSUB_TTL_MS = 180 * 86_400_000;

export const UNSUB_LINKS = Symbol('UNSUB_LINKS');

export interface UnsubLinks {
  /** Origin web app (APP_PUBLIC_URL). */
  appBase: string;
  key: Buffer;
}

export function unsubLinksFor(src: Record<string, string | undefined>, key: Buffer | undefined): UnsubLinks | null {
  return key ? { appBase: (src.APP_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, ''), key } : null;
}

const sign = (key: Buffer, body: string) => createHmac('sha256', key).update(`unsub:${body}`).digest('base64url').slice(0, 32);

export function unsubToken(key: Buffer, ws: string, recipientId: string, now: Date): string {
  const body = `${ws}.${recipientId}.${(now.getTime() + UNSUB_TTL_MS).toString(36)}`;
  return `${body}.${sign(key, body)}`;
}

export const unsubUrl = (l: UnsubLinks, ws: string, recipientId: string, now: Date) => `${l.appBase}/campaign/unsubscribe?t=${unsubToken(l.key, ws, recipientId, now)}`;

/** Token hợp lệ + còn hạn → { ws, recipientId }; còn lại null. So khớp chữ ký thời gian hằng. */
export function readUnsubToken(key: Buffer, token: string, now: Date): { ws: string; recipientId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [ws, recipientId, exp, sig] = parts as [string, string, string, string];
  if (!UUID.test(ws) || !UUID.test(recipientId) || !/^[0-9a-z]{1,12}$/.test(exp)) return null;
  const want = Buffer.from(sign(key, `${ws}.${recipientId}.${exp}`));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  return parseInt(exp, 36) > now.getTime() ? { ws, recipientId } : null;
}
