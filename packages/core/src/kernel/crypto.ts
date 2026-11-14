// Mã hoá thông tin xác thực của DN (ops §2.2): AES-256-GCM, khoá chủ `APP_ENC_KEY` (32 byte base64 / hex). Một chỗ duy nhất
// encrypt / decrypt cho integration_connection (TIP-012), channel_account (TIP-014), khoá LLM nền tảng (TIP-019).
// Định dạng: [key_version 1 byte][iv 12][tag 16][ciphertext] — xoay khoá: thêm version mới, đọc bản cũ bằng khoá cũ.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const SECRET_KEY_VERSION = 1;
const IV = 12;
const TAG = 16;

export const ENC_KEY = Symbol('ENC_KEY');

/** Khoá 32 byte từ chuỗi env: base64 (44 ký tự) hoặc hex (64 ký tự). */
export function parseEncKey(raw: string): Buffer {
  const k = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('APP_ENC_KEY phải là 32 byte (base64 hoặc hex)');
  return k;
}

export function encryptSecret(plain: string, key: Buffer): Buffer {
  const iv = randomBytes(IV);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([Buffer.from([SECRET_KEY_VERSION]), iv, c.getAuthTag(), body]);
}

/** Sai khoá / dữ liệu bị sửa → ném (GCM auth tag). */
export function decryptSecret(blob: Uint8Array, key: Buffer): string {
  const b = Buffer.from(blob);
  if (b.length < 1 + IV + TAG || b[0] !== SECRET_KEY_VERSION) throw new Error('secret: định dạng / phiên bản khoá không hỗ trợ');
  const d = createDecipheriv('aes-256-gcm', key, b.subarray(1, 1 + IV));
  d.setAuthTag(b.subarray(1 + IV, 1 + IV + TAG));
  return Buffer.concat([d.update(b.subarray(1 + IV + TAG)), d.final()]).toString('utf8');
}

/** Bộ bí mật dạng object ↔ một blob (JSON bên trong). */
export const sealSecrets = (s: Record<string, string>, key: Buffer) => encryptSecret(JSON.stringify(s), key);
export const openSecrets = (blob: Uint8Array, key: Buffer) => JSON.parse(decryptSecret(blob, key)) as Record<string, string>;
