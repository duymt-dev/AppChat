// Link tải tệp có chữ ký (TIP-025): tệp đính kèm của tin nhắn cần mở được bằng thẻ <img> / link trên trình duyệt và được worker
// kênh tải về khi gửi (fetchFile) — không có access token. URL = `<API public>/v1/files/<id>/raw?ws=<workspace>&sig=<HMAC>`; chữ ký
// HMAC-SHA256 theo khoá chủ APP_ENC_KEY trên (workspace, file) — không đoán được, đổi khoá = thu hồi mọi link.
import { createHmac, timingSafeEqual } from 'node:crypto';

const sign = (key: Buffer, ws: string, fileId: string) => createHmac('sha256', key).update(`file:${ws}:${fileId}`).digest('base64url').slice(0, 32);

export function signedFileUrl(apiBase: string, key: Buffer, ws: string, fileId: string): string {
  return `${apiBase.replace(/\/$/, '')}/v1/files/${fileId}/raw?ws=${ws}&sig=${sign(key, ws, fileId)}`;
}

export function verifyFileSig(key: Buffer, ws: string, fileId: string, sig: string): boolean {
  const want = Buffer.from(sign(key, ws, fileId));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Link ký nội bộ → `{ ws, fileId }` khi đúng origin + đúng route `/v1/files/<id>/raw` + chữ ký hợp lệ (TIP-045b: worker kênh đọc thẳng
 *  Storage thay vì gọi HTTP về localhost); `ws` tuỳ chọn để buộc đúng workspace. Sai bất kỳ điều kiện nào → null. */
export function parseSignedFileUrl(url: string, apiBase: string, key: Buffer, ws?: string): { ws: string; fileId: string } | null {
  let u: URL;
  let base: URL;
  try {
    u = new URL(url);
    base = new URL(apiBase);
  } catch {
    return null;
  }
  if (u.origin !== base.origin || u.hash || u.username || u.password) return null;
  const m = /^\/v1\/files\/([0-9a-f-]{36})\/raw$/i.exec(u.pathname.slice(base.pathname.replace(/\/$/, '').length));
  const w = u.searchParams.get('ws');
  const sig = u.searchParams.get('sig');
  if (!m || !w || !/^[A-Za-z0-9_-]{1,64}$/.test(w) || !sig || (ws && w !== ws)) return null;
  return verifyFileSig(key, w, m[1]!, sig) ? { ws: w, fileId: m[1]!.toLowerCase() } : null;
}
