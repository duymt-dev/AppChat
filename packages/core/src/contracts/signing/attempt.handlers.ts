// contract.sign_attempt_prepare · sign_attempt_stage (TIP-030c §2.3–2.4, §3.2): action riêng — chỉ pipeline ký (capability niêm phong) gọi.
// Prepare: khoá họ khách → hợp đồng → người ký → token, kiểm OTP từ phong bì bí mật tạm (không ở input). Sai → +1 lần sai + `otp_fail` +
// biên nhận `rejected` cùng transaction (KHÔNG ném — kế toán lỗi không bị rollback; facade ném 422 / 410 sau commit). Đúng → `verified` gắn
// thế hệ + băm mã + hash tài liệu; chưa tiêu mã, chưa ký. Stage: gắn ứng viên đã render + đọc lại SHA khớp, chỉ khi đúng thế hệ render đang giữ.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, SIGN_OTP_MAX_FAILS } from '@appchat/shared';
import type { ActionInput, contractSignAttemptPrepare, contractSignAttemptStage } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { ContractDeps } from '../services/contract-deps';
import { logSignEvent } from '../services/contract-write';
import { requireSigning } from './capability';
import { attemptDigest, signatureDigest } from './attempts';
import { otpMatches } from './otp';
import { liveCustomer } from './read';

type Disposition = 'rejected' | 'verified' | 'staged' | 'finalized' | 'stale' | 'expired';
type PrepOut = { attempt_id: string; disposition: Disposition; remaining_attempts: number | null; rejection_code: string | null };
const deny = (): never => {
  throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
};

@Injectable()
@ActionHandler('contract.sign_attempt_prepare')
export class ContractSignAttemptPrepareHandler implements Handler<ActionInput<typeof contractSignAttemptPrepare>, PrepOut> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractSignAttemptPrepare>, tx: TenantTx): Promise<HandlerOutcome<PrepOut>> {
    const cap = requireSigning(ctx, 'contract.sign_attempt_prepare', input.contract_id);
    const key = this.d.need('env').key;
    if (!cap.secret || cap.party !== 'customer' || input.party !== 'customer') throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    // Phong bì bí mật phải đúng digest đã khai (input không mang OTP / chữ ký).
    if (attemptDigest(key, cap.secret.otp, cap.secret.signaturePng) !== input.input_digest) throw new AppError('CONFLICT', 409, { attempt: 'digest_mismatch' });
    const now = this.clock.now();
    const { c, s, t } = await liveCustomer(tx, cap, now);
    const prior = await tx.contractSigningAttempt.findUnique({ where: { requestKeyHash: cap.requestRef } });
    if (prior) {
      if (prior.inputDigest !== input.input_digest) throw new AppError('CONFLICT', 409, { request_id: 'changed' });
      return { result: { attempt_id: prior.id, disposition: prior.phase === 'rendering' ? 'verified' : (prior.phase as Disposition), remaining_attempts: prior.remainingAttempts, rejection_code: prior.rejectionCode }, noUndo: true };
    }
    const base = {
      id: uuidv7(now.getTime()),
      requestKeyHash: cap.requestRef,
      inputDigest: input.input_digest,
      contractId: c.id,
      signerId: s.id,
      party: 'customer',
      tokenId: t.id,
      contractVersion: c.version,
      sourceVersion: c.sourceVersion,
      sourceSha256: c.fileSha256,
      signatureDigest: signatureDigest(cap.secret.signaturePng),
      otpGeneration: s.otpGeneration,
      createdAt: now,
      updatedAt: now,
    };
    const expired = !s.otpHash || !s.otpExpiresAt || s.otpExpiresAt < now;
    if (expired || !otpMatches(key, s, cap.secret.otp)) {
      // Sai mã: đếm một lần mỗi lần thử khác nhau (dòng người ký đang khoá → không mất lượt đếm khi đồng thời). Mã hết hạn không trừ lượt.
      const fails = expired ? s.otpFails : s.otpFails + 1;
      if (!expired) {
        await tx.contractSigner.update({ where: { id: s.id }, data: { otpFails: fails } });
        await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'otp_fail', actorName: s.name, ip: cap.client.ip, userAgent: cap.client.userAgent, at: now });
      }
      const left = Math.max(0, SIGN_OTP_MAX_FAILS - fails);
      const code = expired ? 'expired' : fails >= SIGN_OTP_MAX_FAILS ? 'locked' : 'invalid';
      await tx.contractSigningAttempt.create({ data: { ...base, phase: 'rejected', rejectionCode: code, remainingAttempts: left, expiresAt: now } });
      return { result: { attempt_id: base.id, disposition: 'rejected', remaining_attempts: left, rejection_code: code }, noUndo: true };
    }
    if (!c.fileId || !c.fileSha256) throw new AppError('INVALID_STATE', 409, { file: 'not_frozen' });
    await tx.contractSigningAttempt.create({ data: { ...base, phase: 'verified', verificationDigest: s.otpHash, remainingAttempts: SIGN_OTP_MAX_FAILS - s.otpFails, expiresAt: s.otpExpiresAt! } });
    return { result: { attempt_id: base.id, disposition: 'verified', remaining_attempts: SIGN_OTP_MAX_FAILS - s.otpFails, rejection_code: null }, noUndo: true };
  }

  async preview(): Promise<never> {
    return deny();
  }
}

@Injectable()
@ActionHandler('contract.sign_attempt_stage')
export class ContractSignAttemptStageHandler implements Handler<ActionInput<typeof contractSignAttemptStage>, { attempt_id: string; disposition: Disposition }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractSignAttemptStage>, tx: TenantTx): Promise<HandlerOutcome<{ attempt_id: string; disposition: Disposition }>> {
    const cap = requireSigning(ctx, 'contract.sign_attempt_stage', input.contract_id);
    const now = this.clock.now();
    await tx.$queryRaw`SELECT 1 FROM contract_signing_attempt WHERE id = ${input.attempt_id}::uuid FOR UPDATE`;
    const a = await tx.contractSigningAttempt.findUnique({ where: { id: input.attempt_id } });
    if (!a || a.contractId !== cap.contractId || a.signerId !== cap.signerId || a.tokenId !== cap.tokenId) throw new AppError('NOT_FOUND', 404, { attempt: 'not_found' });
    // Chỉ lượt render đang giữ (đúng thế hệ) được ghi; lượt cũ hết lease → thua, tệp của nó để quét dọn.
    if (a.phase !== 'rendering' || a.renderGeneration !== input.render_generation) return { result: { attempt_id: a.id, disposition: a.phase === 'rendering' ? 'verified' : (a.phase as Disposition) }, noUndo: true };
    if (input.outcome === 'stale') {
      await tx.contractSigningAttempt.update({ where: { id: a.id }, data: { phase: 'stale', rejectionCode: 'source_changed', renderToken: null, leaseUntil: null, updatedAt: now } });
      return { result: { attempt_id: a.id, disposition: 'stale' }, noUndo: true };
    }
    if (!input.candidate_file_id || !input.signature_file_id || !input.candidate_sha256) throw new AppError('VALIDATION_FAILED', 422, { candidate: 'required' });
    const files = await tx.file.findMany({ where: { id: { in: [input.candidate_file_id, input.signature_file_id] } }, select: { id: true, sha256: true, confirmed: true, purpose: true } });
    const cand = files.find((f) => f.id === input.candidate_file_id);
    if (!cand || cand.sha256 !== input.candidate_sha256 || files.length !== 2 || files.some((f) => f.confirmed || f.purpose !== 'document')) throw new AppError('CONFLICT', 409, { candidate: 'mismatch' });
    await tx.contractSigningAttempt.update({ where: { id: a.id }, data: { phase: 'staged', candidateFileId: cand.id, signatureFileId: input.signature_file_id, candidateSha256: input.candidate_sha256, renderToken: null, leaseUntil: null, updatedAt: now } });
    return { result: { attempt_id: a.id, disposition: 'staged' }, noUndo: true };
  }

  async preview(): Promise<never> {
    return deny();
  }
}
