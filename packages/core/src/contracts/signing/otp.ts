// OTP ký hợp đồng cha (TIP-030c §2.1, §2.4): mỗi lần phát / huỷ mã tăng `otp_generation` của người ký (đơn điệu, không dùng updated_at);
// mã lưu dạng HMAC theo khoá ứng dụng + miền tách biệt (người ký + thế hệ) — không băm trần mã 6 số (dò ngược được). TTL 10 phút, sai 5 lần
// khoá như trước. Lần thử ký gắn đúng thế hệ: mã mới phát trong lúc render làm lần thử cũ hết hiệu lực, không bao giờ tiêu mã mới.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TenantTx } from '../../kernel/actions/action-context';
import { OTP_TTL_MS, newOtp } from '../services/sign-link';

const DOMAIN = 'appchat:contract-otp:v1';

export const otpMac = (key: Buffer, signerId: string, generation: number, otp: string) => createHmac('sha256', key).update(`${DOMAIN}|${signerId}|${generation}|${otp}`).digest('hex');

/** Mã đúng cho đúng người ký + thế hệ (so thời gian hằng). */
export function otpMatches(key: Buffer, s: { id: string; otpGeneration: number; otpHash: string | null }, otp: string): boolean {
  if (!s.otpHash || !/^\d{6}$/.test(otp)) return false;
  const a = Buffer.from(otpMac(key, s.id, s.otpGeneration, otp), 'hex');
  const b = Buffer.from(s.otpHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface IssuedOtp {
  code: string;
  generation: number;
  expiresAt: Date;
}

/** Phát mã mới trong transaction của action: tăng thế hệ (mã / lần thử cũ hết hiệu lực) + HMAC + hạn. `resetFails` theo luồng hiện có (Owner). */
export async function issueOtp(tx: Pick<TenantTx, '$queryRaw'>, key: Buffer, signerId: string, now: Date, resetFails: boolean): Promise<IssuedOtp> {
  const code = newOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const [r] = await tx.$queryRaw<{ gen: number }[]>`
    UPDATE contract_signer SET otp_generation = otp_generation + 1, otp_expires_at = ${expiresAt}, otp_fails = CASE WHEN ${resetFails} THEN 0 ELSE otp_fails END
     WHERE id = ${signerId}::uuid RETURNING otp_generation AS gen`;
  if (!r) throw new Error('issueOtp: không thấy người ký');
  await tx.$queryRaw`UPDATE contract_signer SET otp_hash = ${otpMac(key, signerId, r.gen, code)} WHERE id = ${signerId}::uuid AND otp_generation = ${r.gen} RETURNING id`;
  return { code, generation: r.gen, expiresAt };
}
