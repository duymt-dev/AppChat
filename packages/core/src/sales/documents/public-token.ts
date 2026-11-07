// Token link công khai chứng từ (TIP-032b P2): `<id>.<HMAC(APP_ENC_KEY, "doc:<id>") base64url 32>` — miền ký riêng ("doc:") nên token
// trang ký hợp đồng / phụ lục / báo giá không dùng được ở đây và ngược lại. Platform `commerce_link` lưu sha256(token) + workspace +
// chứng từ / version / tệp / hạn; token thô chỉ trả cho tin gửi khách (không ghi log / action_log / AI trace — `redactLink`).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const SIG_LEN = 32;
const sig = (key: Buffer, id: string) => createHmac('sha256', key).update(`doc:${id}`).digest('base64url').slice(0, SIG_LEN);

export const docTokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export const docToken = (key: Buffer, id: string) => `${id}.${sig(key, id)}`;

/** Kiểm chữ ký → id link (null = giả / token miền khác / sai khoá) — kiểm trước khi chạm DB. */
export function readDocToken(key: Buffer, token: string): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const want = Buffer.from(sig(key, m[1]!));
  const got = Buffer.from(m[2]!);
  return want.length === got.length && timingSafeEqual(want, got) ? m[1]! : null;
}

export const documentUrl = (appBase: string, token: string) => `${appBase}/documents/${token}`;

/** Che token trong chữ ghi log / action_log / dấu vết AI: giữ phần id, bỏ chữ ký. */
export const redactLink = (s: string) => s.replace(/(\/documents\/[0-9a-f-]{36})\.[A-Za-z0-9_-]{32}/g, '$1.…');
