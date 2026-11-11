// contract.public_open · public_otp · public_decline (TIP-030c §1.1–1.4, §4.1): chỉ chạy với capability niêm phong do bộ chuyển token
// (signing/module.ts) gắn vào ctx — /actions (kể cả Owner), Trợ lý, agent đều 403 ở preview lẫn execute. Trong transaction: khoá họ khách →
// hợp đồng → người ký → token rồi kiểm lại. Mở link ghi `opened` một lần mỗi request (khoá idempotency). Xin OTP: tăng thế hệ + HMAC +
// tin vào đúng hội thoại đã gửi link (outbox kênh) cùng transaction — không mượn quyền Owner (sender hệ thống).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONTRACT_FLOW, assertTransition, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, contractPublicDecline, contractPublicOpen, contractPublicOtp } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, writeTimeline } from '../../crm/public';
import { enqueueOutgoing } from '../../inbox/public';
import { postToCustomer } from '../../sales/public';
import { ContractDeps } from '../services/contract-deps';
import { logSignEvent, moveContract } from '../services/contract-write';
import { maskTarget } from '../services/sign-link';
import { requireSigning } from './capability';
import { issueOtp } from './otp';
import { liveCustomer, lockSigningRoots, signInvalid } from './read';

const SENDER = { type: 'system' as const, id: null, name: null };
const SYSTEM = { type: 'system', id: null };
const deny = (): never => {
  throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
};

export const ownerNotice = (c: { id: string; code: string; ownerUserId: string | null }, kind: 'contract_signed' | 'contract_declined', contact: string, reason?: string) => ({
  topic: 'notify.requested',
  payload: { kind, to: c.ownerUserId ? { user_ids: [c.ownerUserId], permission: 'contract.sign' } : { permission: 'contract.sign' }, params: { code: c.code, contact: contact.slice(0, 200), reason: reason?.slice(0, 200) ?? '' }, link: `/contracts?c=${c.id}` },
});

@Injectable()
@ActionHandler('contract.public_open')
export class ContractPublicOpenHandler implements Handler<ActionInput<typeof contractPublicOpen>, { contract_id: string; status: string; recorded: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractPublicOpen>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string; status: string; recorded: boolean }>> {
    const cap = requireSigning(ctx, 'contract.public_open', input.contract_id);
    const now = this.clock.now();
    const c = await lockSigningRoots(tx, cap.contractId);
    const t = cap.tokenId ? await tx.contractSignToken.findUnique({ where: { id: cap.tokenId } }) : null;
    if (!t || t.contractId !== c.id || t.tokenHash !== cap.tokenHash || c.deletedAt) throw signInvalid();
    const usable = !t.usedAt && t.expiresAt >= now;
    if (c.status === 'pending_signature' && !usable) throw signInvalid();
    if (c.status !== 'pending_signature') return { result: { contract_id: c.id, status: c.status, recorded: false }, noUndo: true };
    const s = await tx.contractSigner.findUnique({ where: { id: t.signerId }, select: { name: true } });
    await logSignEvent(tx, { contractId: c.id, signerId: t.signerId, type: 'opened', actorName: s?.name ?? '', ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { request: cap.requestRef.slice(0, 16) }, at: now });
    return { result: { contract_id: c.id, status: c.status, recorded: true }, noUndo: true };
  }

  async preview(): Promise<never> {
    return deny();
  }
}

type OtpOut = { contract_id: string; channel: string; sent_to: string; otp_generation: number; delivery_status: 'queued' | 'accepted' | 'unknown' | 'suppressed' };

@Injectable()
@ActionHandler('contract.public_otp')
export class ContractPublicOtpHandler implements Handler<ActionInput<typeof contractPublicOtp>, OtpOut> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractPublicOtp>, tx: TenantTx): Promise<HandlerOutcome<OtpOut>> {
    const cap = requireSigning(ctx, 'contract.public_otp', input.contract_id);
    const now = this.clock.now();
    const { c, s } = await liveCustomer(tx, cap, now);
    const conv = c.conversationId ? await tx.conversation.findUnique({ where: { id: c.conversationId } }) : null;
    if (!conv) throw new AppError('INVALID_STATE', 409, { channel: 'no_conversation' });
    // Luồng công khai hiện có: xin mã lại không đặt lại số lần sai.
    const otp = await issueOtp(tx, this.d.need('env').key, s.id, now, false);
    await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'otp_sent', actorName: 'system', ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { channel: s.otpChannel, generation: otp.generation }, at: now });
    const { locale } = await this.d.place(ctx.workspaceId);
    const text = interpolate(serverMessages(locale).sales.contract.otpMessage, { code: c.code, otp: otp.code });
    const sent = await postToCustomer(ctx, tx, this.members, { conv, created: false, text, now, sender: SENDER });
    const target = s.otpChannel === 'email' ? (s.email ?? '') : (s.phone ?? '');
    return {
      result: { contract_id: c.id, channel: s.otpChannel ?? 'zalo_personal', sent_to: maskTarget(target), otp_generation: otp.generation, delivery_status: 'queued' },
      events: sent.events,
      noUndo: true,
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(): Promise<never> {
    return deny();
  }
}

@Injectable()
@ActionHandler('contract.public_decline')
export class ContractPublicDeclineHandler implements Handler<ActionInput<typeof contractPublicDecline>, { contract_id: string; status: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractPublicDecline>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string; status: string }>> {
    const cap = requireSigning(ctx, 'contract.public_decline', input.contract_id);
    const now = this.clock.now();
    const { c, s, t } = await liveCustomer(tx, cap, now);
    const why = input.reason?.trim().slice(0, 500) || serverMessages((await this.d.place(ctx.workspaceId)).locale).sales.contract.declineDefault;
    const to = assertTransition(CONTRACT_FLOW, c.status, 'contract.decline');
    await moveContract(tx, c, to, { declinedReason: why, decidedAt: now }, now);
    await tx.contractSignToken.update({ where: { id: t.id }, data: { usedAt: now } });
    // Mã còn hiệu lực không dùng được nữa: tăng thế hệ (lần thử đang render không chốt được).
    await tx.$executeRaw`UPDATE contract_signer SET otp_generation = otp_generation + 1, otp_hash = NULL, otp_expires_at = NULL WHERE id = ${s.id}::uuid`;
    await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'declined', actorName: s.name, ip: cap.client.ip, userAgent: cap.client.userAgent, meta: { reason: why }, at: now });
    await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_declined', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id: c.id }, at: now });
    return {
      result: { contract_id: c.id, status: to },
      events: [{ topic: 'contract.declined', payload: { contract_id: c.id, contact_id: c.contactId, code: c.code, reason: why } }, ownerNotice(c, 'contract_declined', s.name, why)],
      noUndo: true,
    };
  }

  async preview(): Promise<never> {
    return deny();
  }
}
