// Link xem báo giá gửi khách (COMMERCE §3 "Link xem báo giá ghi nhận viewed"): `<APP_PUBLIC_URL>/q/<token>`; token =
// `<workspace>.<quote>.<HMAC>` (HMAC-SHA256 theo khoá chủ APP_ENC_KEY, như link tệp ký — TIP-025). Không đoán được, không cần bảng
// token; đổi khoá = thu hồi mọi link. Mỗi phiên bản một link (id phiên bản).
import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const QUOTE_LINKS = Symbol('QUOTE_LINKS');

export interface QuoteLinks {
  /** Origin web app (APP_PUBLIC_URL). */
  appBase: string;
  key: Buffer;
}

const sign = (key: Buffer, ws: string, id: string) => createHmac('sha256', key).update(`quote:${ws}:${id}`).digest('base64url').slice(0, 32);

export function quoteToken(key: Buffer, ws: string, quoteId: string): string {
  return `${ws}.${quoteId}.${sign(key, ws, quoteId)}`;
}

export function quoteUrl(l: QuoteLinks, ws: string, quoteId: string): string {
  return `${l.appBase.replace(/\/$/, '')}/q/${quoteToken(l.key, ws, quoteId)}`;
}

/** Token hợp lệ → { ws, quoteId }; sai → null (controller trả 404, không lộ lý do). */
export function readQuoteToken(key: Buffer, token: string): { ws: string; quoteId: string } | null {
  const [ws, quoteId, sig] = token.split('.');
  if (!ws || !quoteId || !sig || !UUID.test(ws) || !UUID.test(quoteId)) return null;
  const want = Buffer.from(sign(key, ws, quoteId));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want) ? { ws, quoteId } : null;
}
