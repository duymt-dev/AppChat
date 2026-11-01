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
