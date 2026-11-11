// contract.public_sign — chốt lần ký của khách (TIP-030c §3.3–3.5): khoá biên nhận lần thử → họ khách → hợp đồng → người ký → token, kiểm lại
// TẤT CẢ: token còn hiệu lực (chưa dùng / thay / hết hạn), hợp đồng còn chờ ký đúng version + hash tài liệu, thế hệ OTP + băm mã + hạn khớp
// đúng lần đã kiểm (CAS — không bao giờ `otp_hash IS NOT NULL`), ứng viên đã đóng băng (staged) + SHA. Lệch → đánh dấu `stale` (biên nhận) +
// 410 / 409, không tiêu mã mới, không xác nhận tệp. Đúng → một transaction: tiêu mã + token, xác nhận tệp, `signed`, chứng cứ, timeline /
// giai đoạn khách, gửi bản đã ký vào hội thoại (outbox kênh), biên nhận `finalized` (unique theo người ký + thế hệ → một bên thắng).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONTRACT_FLOW, assertTransition, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, contractPublicSign } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { signedFileUrl } from '../../kernel/files/signed-url';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, applyStageRule, writeTimeline } from '../../crm/public';
import { enqueueOutgoing, type Outgoing } from '../../inbox/public';
import { postToCustomer } from '../../sales/public';
import { ContractDeps } from '../services/contract-deps';
import { logSignEvent, moveContract } from '../services/contract-write';
import { requireSigning } from './capability';
import { ownerNotice } from './public.handlers';
import { liveCustomer, signInvalid } from './read';

type Out = { contract_id: string; status: string; attempt_id: string; disposition: 'finalized' | 'stale' | 'expired' | 'rejected' | 'verified' | 'staged'; signed_sha256: string | null };
const SENDER = { type: 'system' as const, id: null, name: null };
const SYSTEM = { type: 'system', id: null };

@Injectable()
@ActionHandler('contract.public_sign')
export class ContractPublicSignHandler implements Handler<ActionInput<typeof contractPublicSign>, Out> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractPublicSign>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const cap = requireSigning(ctx, 'contract.public_sign', input.contract_id);
    const now = this.clock.now();
    await tx.$queryRaw`SELECT 1 FROM contract_signing_attempt WHERE id = ${input.attempt_id}::uuid FOR UPDATE`;
    const a = await tx.contractSigningAttempt.findUnique({ where: { id: input.attempt_id } });
    if (!a || a.contractId !== cap.contractId || a.signerId !== cap.signerId || a.tokenId !== cap.tokenId) throw new AppError('NOT_FOUND', 404, { attempt: 'not_found' });
    const done = (disposition: Out['disposition'], sha: string | null, status: string): HandlerOutcome<Out> => ({ result: { contract_id: a.contractId, status, attempt_id: a.id, disposition, signed_sha256: sha }, noUndo: true });
    if (a.phase !== 'staged') return done(a.phase === 'rendering' ? 'verified' : a.phase, null, '');
    const stale = async (code: string) => {
      await tx.contractSigningAttempt.update({ where: { id: a.id }, data: { phase: 'stale', rejectionCode: code, updatedAt: now } });
      return done('stale', null, '');
    };
    let live;
    try {
      live = await liveCustomer(tx, cap, now);
    } catch (e) {
      if (e instanceof AppError && e.code === 'SIGN_LINK_INVALID') return stale('link_invalid');
      throw e;
    }
    const { c, s, t } = live;
    // Mã mới phát / hết hạn / tài liệu đổi kể từ lúc kiểm → lần thử cũ không chốt được (không tiêu mã mới).
    if (s.otpGeneration !== a.otpGeneration || s.otpHash !== a.verificationDigest || !s.otpExpiresAt || s.otpExpiresAt < now) return stale('otp_changed');
    if (c.version !== a.contractVersion || c.sourceVersion !== a.sourceVersion || c.fileSha256 !== a.sourceSha256) return stale('source_changed');
    const files = await tx.file.findMany({ where: { id: { in: [a.candidateFileId!, a.signatureFileId!] } }, select: { id: true, sha256: true, confirmed: true, name: true } });
    const pdf = files.find((f) => f.id === a.candidateFileId);
    if (!pdf || pdf.sha256 !== a.candidateSha256 || files.length !== 2 || files.some((f) => f.confirmed)) return stale('candidate_changed');
    const used = await tx.contractSigner.updateMany({
      where: { id: s.id, otpGeneration: a.otpGeneration, otpHash: a.verificationDigest, signedAt: null },
      data: { otpHash: null, otpExpiresAt: null, signedAt: now, ip: cap.client.ip, userAgent: cap.client.userAgent, signatureImageFileId: a.signatureFileId },
    });
    if (!used.count) throw signInvalid();
    await tx.file.updateMany({ where: { id: { in: [pdf.id, a.signatureFileId!] } }, data: { confirmed: true } });
    const sha = a.candidateSha256!;
    await moveContract(tx, c, assertTransition(CONTRACT_FLOW, c.status, 'contract.sign'), { signedByCustomerAt: now, signedFileId: pdf.id, signedSha256: sha, signedDate: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`), decidedAt: now }, now);
    await tx.contractSignToken.update({ where: { id: t.id }, data: { usedAt: now } });
    await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'otp_ok', actorName: s.name, ip: cap.client.ip, userAgent: cap.client.userAgent, at: now });
    await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'signed', actorName: s.name, docSha256: sha, ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { attempt: a.id, channel: s.otpChannel }, at: now });
    await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_signed', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id: c.id }, at: now });
    const stage = await applyStageRule(tx, { contactId: c.contactId, mode: 'raise', to: 'contract', actor: SYSTEM, now });
    const events = [{ topic: 'contract.signed', payload: { contract_id: c.id, contact_id: c.contactId, code: c.code, signed_sha256: sha } }, ownerNotice(c, 'contract_signed', s.name), ...stage];
    let out: Outgoing | null = null;
    const conv = c.conversationId ? await tx.conversation.findUnique({ where: { id: c.conversationId } }) : null;
    if (conv) {
      const env = this.d.need('env');
      const text = interpolate(serverMessages((await this.d.place(ctx.workspaceId)).locale).sales.contract.signedMessage, { code: c.code, sha: sha.slice(0, 16) });
      const sent = await postToCustomer(ctx, tx, this.members, { conv, created: false, text, file: { url: signedFileUrl(env.apiBase, env.key, ctx.workspaceId, pdf.id), name: pdf.name, fileId: pdf.id }, now, sender: SENDER });
      out = sent.out;
      events.push(...sent.events);
    }
    await tx.contractSigningAttempt.update({ where: { id: a.id }, data: { phase: 'finalized', effectRef: `contract:${c.id}:signed`, updatedAt: now } });
    return { ...done('finalized', sha, 'signed'), events, ...(out ? { afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out!) } : {}) };
  }

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
  }
}
