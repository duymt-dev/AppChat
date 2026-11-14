// Kiểm OTP "Duyệt & ký" của Owner có biên nhận (TIP-030c §2.3): transaction riêng, khoá dòng người ký business (FOR UPDATE) rồi đọc lại —
// hai lần thử sai đồng thời đếm đúng hai (không ghi đè từ bản chụp cũ); biên nhận theo (người dùng + Idempotency-Key): gửi lại cùng yêu cầu
// trả đúng kết cục cũ, không đếm lại; cùng khoá khác OTP / chữ ký → 409. Đúng → `verified` gắn thế hệ + băm mã (execute chốt CAS đúng thế
// hệ đó rồi đánh dấu `finalized`). Lỗi ném SAU khi transaction kế toán commit.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { AppError, SIGN_OTP_MAX_FAILS } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { logSignEvent } from '../services/contract-write';
import { attemptDigest, signatureDigest } from './attempts';
import { otpMatches } from './otp';

export const ownerRequestRef = (userId: string, key: string) => createHash('sha256').update(`owner-sign|${userId}|${key}`).digest('hex');

type Outcome = { ok: true; attemptId: string; generation: number } | { ok: false; code: 'expired' | 'invalid'; left: number };

export async function verifyOwnerOtp(db: TenantDb, encKey: Buffer, i: { contractId: string; userId: string; idempotencyKey: string; otp: string; png: string; contractVersion: number; sourceVersion: number; now: Date }): Promise<{ attemptId: string; generation: number }> {
  const ref = ownerRequestRef(i.userId, i.idempotencyKey);
  const digest = attemptDigest(encKey, i.otp, i.png);
  const r = await db.$transaction(async (tx: TenantTx): Promise<Outcome> => {
    await tx.$queryRaw`SELECT 1 FROM contract_signer WHERE contract_id = ${i.contractId}::uuid AND party = 'business' FOR UPDATE`;
    const prior = await tx.contractSigningAttempt.findUnique({ where: { requestKeyHash: ref } });
    if (prior) {
      if (prior.inputDigest !== digest) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
      return prior.phase === 'rejected' ? { ok: false, code: prior.rejectionCode === 'expired' ? 'expired' : 'invalid', left: prior.remainingAttempts ?? 0 } : { ok: true, attemptId: prior.id, generation: prior.otpGeneration };
    }
    const s = await tx.contractSigner.findUnique({ where: { contractId_party: { contractId: i.contractId, party: 'business' } } });
    if (!s) throw new AppError('OTP_INVALID', 422, { otp: 'expired' }, '0');
    const base = { id: uuidv7(i.now.getTime()), requestKeyHash: ref, inputDigest: digest, contractId: i.contractId, signerId: s.id, party: 'business', actorUserId: i.userId, contractVersion: i.contractVersion, sourceVersion: i.sourceVersion, signatureDigest: signatureDigest(i.png), otpGeneration: s.otpGeneration, createdAt: i.now, updatedAt: i.now };
    const expired = !s.otpHash || !s.otpExpiresAt || s.otpExpiresAt < i.now || s.otpFails >= SIGN_OTP_MAX_FAILS || s.userId !== i.userId;
    if (expired || !otpMatches(encKey, s, i.otp)) {
      const fails = expired ? s.otpFails : s.otpFails + 1;
      if (!expired) {
        await tx.contractSigner.update({ where: { id: s.id }, data: { otpFails: fails } });
        await logSignEvent(tx, { contractId: i.contractId, signerId: s.id, type: 'otp_fail', actorName: s.name, at: i.now });
      }
      const left = expired ? 0 : Math.max(0, SIGN_OTP_MAX_FAILS - fails);
      await tx.contractSigningAttempt.create({ data: { ...base, phase: 'rejected', rejectionCode: expired ? 'expired' : 'invalid', remainingAttempts: left, expiresAt: i.now } });
      return { ok: false, code: expired ? 'expired' : 'invalid', left };
    }
    await tx.contractSigningAttempt.create({ data: { ...base, phase: 'verified', verificationDigest: s.otpHash, remainingAttempts: SIGN_OTP_MAX_FAILS - s.otpFails, expiresAt: s.otpExpiresAt! } });
    return { ok: true, attemptId: base.id, generation: s.otpGeneration };
  });
  if (!r.ok) throw new AppError('OTP_INVALID', 422, { otp: r.code }, String(r.left));
  return { attemptId: r.attemptId, generation: r.generation };
}

/** Trong transaction chốt của execute: biên nhận verified → finalized (chỉ một lần). */
export async function finalizeOwnerAttempt(tx: Pick<TenantTx, '$executeRaw'>, attemptId: string, effectRef: string, now: Date): Promise<void> {
  await tx.$executeRaw`UPDATE contract_signing_attempt SET phase = 'finalized', effect_ref = ${effectRef}, updated_at = ${now} WHERE id = ${attemptId}::uuid AND phase = 'verified'`;
}
