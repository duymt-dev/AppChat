// Link ký một lần (Blueprint §4.4 public, §2.2 contract_sign_token + platform tenant_sign_route): token = `<id token>.<HMAC(APP_ENC_KEY,
// "sign:<id>") base64url 32>` — không lưu token thô; DB tenant lưu `token_hash = sha256(token)`, DB nền tảng định tuyến hash → workspace
// (trang công khai chưa biết workspace). Token đọc lại được để người nội bộ sao chép link (DetailTabs); đổi khoá → mọi link cũ hỏng.
// OTP 6 số lưu băm, hiệu lực 10 phút.
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const SIG_LEN = 32;
export const OTP_TTL_MS = 10 * 60_000;

const sig = (key: Buffer, id: string) => createHmac('sha256', key).update(`sign:${id}`).digest('base64url').slice(0, SIG_LEN);

export const sha256Hex = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');

/** Token của bản ghi `contract_sign_token` id. */
export const signToken = (key: Buffer, tokenId: string) => `${tokenId}.${sig(key, tokenId)}`;

/** Đọc + kiểm chữ ký token → id bản ghi token (null = giả / sai khoá). */
export function readSignToken(key: Buffer, token: string): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const want = Buffer.from(sig(key, m[1]!));
  const got = Buffer.from(m[2]!);
  return want.length === got.length && timingSafeEqual(want, got) ? m[1]! : null;
}

export const signUrl = (appBase: string, token: string) => `${appBase}/sign/${token}`;

export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** OTP băm gắn với người ký (không trùng giữa hai bên / hai hợp đồng). */
export const otpHash = (signerId: string, otp: string) => sha256Hex(`${signerId}:${otp}`);

export function sameOtp(signerId: string, otp: string, hash: string | null): boolean {
  if (!hash || !/^\d{6}$/.test(otp)) return false;
  const a = Buffer.from(otpHash(signerId, otp), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Che SĐT / email khi báo "đã gửi OTP tới …". */
export function maskTarget(v: string): string {
  if (v.includes('@')) {
    const [u, d] = v.split('@') as [string, string];
    return `${u.slice(0, 2)}•••@${d}`;
  }
  return v.replace(/\d(?=\d{3})/g, '•');
}
