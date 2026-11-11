// Việc hệ thống của hợp đồng: facade mỏng — TIP-003c chuyển thân transaction sang action riêng `contract.system_transition`
// (contracts/system/*): link ký quá hạn mà khách chưa ký → `declined`; T-30 nhắc gia hạn một lần (COMMERCE §9); qua ngày kết thúc →
// `expired`. Mã OTP "Duyệt & ký" của Owner gửi email (030c sẽ chuẩn hoá ký cha).
import type { TenantDb } from '@appchat/db';
import { AppError, CONTRACT_FLOW, interpolate, nextState, serverMessages } from '@appchat/shared';
import type { SystemRunDeps } from '../../kernel/actions/system';
import { expireContractsDue, expireLinksDue, renewalNoticesDue } from '../system/dispatch';
import { uuidv7 } from '../../kernel/ids';
import type { ContractDeps } from './contract-deps';
import { OTP_TTL_MS, newOtp, otpHash } from './sign-link';


/** Link ký hết hạn mà khách chưa ký → `declined` (action riêng `contract.system_transition` — TIP-003c). */
export const expireLinks = (db: TenantDb, ws: string, now: Date, d: SystemRunDeps) => expireLinksDue(db, ws, now, d);

/** T-30: nhắc gia hạn một lần mỗi hợp đồng. */
export const remindRenewal = (db: TenantDb, ws: string, now: Date, timeZone: string, d: SystemRunDeps) => renewalNoticesDue(db, ws, now, timeZone, d);

/** Qua ngày kết thúc → `expired`. */
export const expireContracts = (db: TenantDb, ws: string, now: Date, timeZone: string, d: SystemRunDeps) => expireContractsDue(db, ws, now, timeZone, d);

/** OTP "Duyệt & ký" gửi tới email của chính người ký (Owner / người được uỷ quyền `contract.sign`). Trả email đã che. */
export async function sendOwnerOtp(d: ContractDeps, db: TenantDb, ws: string, c: { id: string; code: string; status: string }, user: { id: string; name: string }, now: Date): Promise<string> {
  if (!nextState(CONTRACT_FLOW, c.status as never, 'contract.approve_and_sign')) throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  const email = await d.userEmail(user.id);
  if (!email) throw new AppError('INVALID_STATE', 409, { email: 'missing' });
  if (d.limiter) await d.limiter.hit({ name: 'sign:owner-otp', limit: 5, windowMs: 15 * 60_000 }, `${ws}:${user.id}`);
  const code = newOtp();
  const s = await db.contractSigner.upsert({
    where: { contractId_party: { contractId: c.id, party: 'business' } },
    create: { id: uuidv7(now.getTime()), contractId: c.id, party: 'business', userId: user.id, name: user.name, email, otpChannel: 'email', createdAt: now },
    update: { userId: user.id, name: user.name, email, otpChannel: 'email', otpFails: 0 },
  });
  await db.contractSigner.update({ where: { id: s.id }, data: { otpHash: otpHash(s.id, code), otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  const m = serverMessages((await d.place(ws)).locale).sales.contract;
  const body = interpolate(m.ownerOtpBody, { code: c.code, otp: code });
  await d.sendMail({ to: email, tag: 'contract_otp', subject: interpolate(m.ownerOtpSubject, { code: c.code, otp: code }), html: `<p>${body}</p>`, text: body });
  return email.replace(/^(.{2})[^@]*/, '$1•••');
}
