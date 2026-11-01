// Mật khẩu argon2id + băm token (ops §2.4) bằng node:crypto (Node 24 — DC-015), không thêm thư viện.
// Định dạng PHC: $argon2id$v=19$m=<KiB>,t=<passes>,p=<lanes>$<salt b64>$<hash b64>.
import { argon2, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(argon2);
// OWASP 2024: m=19 MiB, t=2, p=1.
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 } as const;
const b64 = (b: Buffer) => b.toString('base64').replace(/=+$/, '');

export async function hashPassword(password: string): Promise<string> {
  const nonce = randomBytes(16);
  const hash = await derive('argon2id', { message: password, nonce, ...PARAMS });
  return `$argon2id$v=19$m=${PARAMS.memory},t=${PARAMS.passes},p=${PARAMS.parallelism}$${b64(nonce)}$${b64(hash)}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const m = stored ? PHC.exec(stored) : null;
  if (!m) {
    // Không có hash (user chưa đặt mật khẩu / email không tồn tại) vẫn tốn cùng thời gian → không lộ qua timing.
    await derive('argon2id', { message: password, nonce: Buffer.alloc(16), ...PARAMS });
    return false;
  }
  const expected = Buffer.from(m[5]!, 'base64');
  const hash = await derive('argon2id', {
    message: password,
    nonce: Buffer.from(m[4]!, 'base64'),
    memory: Number(m[1]),
    passes: Number(m[2]),
    parallelism: Number(m[3]),
    tagLength: expected.length,
  });
  return timingSafeEqual(hash, expected);
}

export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** So sánh hash hex constant-time (ops §2.4). */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Token mở (refresh / reset / invite): 32 byte base64url. */
export const newToken = () => randomBytes(32).toString('base64url');

/** OTP 6 số, phân bố đều. */
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Email chuẩn hoá (DC-014): trim + chữ thường. */
export const normalizeEmail = (e: string) => e.trim().toLowerCase();
