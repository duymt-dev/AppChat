// contract.send_for_signature · remind_signer · extend_sign_link · terminate (COMMERCE §9). Gửi ký: chỉ sau khi Owner đã ký
// (`pending_signature`); link ký một lần 7 ngày gửi vào hội thoại của khách (Zalo đang chat / email — mở chuỗi mới nếu cần, như
// báo giá), người ký phía khách ghi `contract_signer` (OTP gửi qua đúng kênh đó); giai đoạn khách → "Hợp đồng". Gia hạn link: dời hạn
// link đang hiệu lực + báo khách. Chấm dứt: Owner, bắt buộc lý do, đơn đã tạo giữ nguyên.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, CONTRACT_FLOW, SIGN_LINK_DAYS, assertTransition, createFmt, dayEndAfter, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, contractExtendSignLink, contractRemindSigner, contractSendForSignature, contractTerminate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, actorUserId, applyStageRule, lockStageFamilyOf, writeTimeline } from '../../crm/public';
import { enqueueOutgoing } from '../../inbox/public';
import { customerConversation, postToCustomer, reachCustomer } from '../../sales/public';
import { lockContract, visibleContract, type ContractRecord } from '../contract-access';
import { ContractDeps } from '../services/contract-deps';
import { issueLink, liveToken, saveLink, type IssuedLink } from '../services/contract-link';
import { signUrl } from '../services/sign-link';
import { actorNameOf, logSignEvent, moveContract } from '../services/contract-write';
import { extendPreview, remindPreview, sendPreview, terminatePreview } from './previews/contract-send.handlers.preview';

const actorOf = (ctx: ActionContext) => ({ type: ctx.actor.type, id: actorUserId(ctx) });

/** Ngữ cảnh chữ cho tin gửi khách (locale / múi giờ workspace). */
async function textCtx(d: ContractDeps, tx: TenantTx, ws: string, c: ContractRecord) {
  const p = await d.place(ws);
  const fmt = createFmt({ locale: p.locale, timeZone: p.timeZone });
  const contact = await tx.contact.findUniqueOrThrow({ where: { id: c.contactId }, select: { id: true, name: true, email: true, phone: true, ownerUserId: true } });
  const bp = await d.need('platform').businessProfile.findUnique({ where: { workspaceId: ws }, select: { legalName: true } });
  return { m: serverMessages(p.locale).sales.contract, fmt, contact, business: bp?.legalName ?? p.name };
}

type SendIn = ActionInput<typeof contractSendForSignature>;
type SendOut = { contract_id: string; sign_url: string; expires_at: string };

@Injectable()
@ActionHandler('contract.send_for_signature')
export class ContractSendHandler implements Handler<SendIn, SendOut> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Kiểm trạng thái + kênh nhận (khách chưa nhắn Zalo / chưa có email → báo ngay) rồi phát link (định tuyến nền tảng). */
  async prepare(ctx: ActionContext, input: SendIn): Promise<IssuedLink> {
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.send_for_signature'));
    await db.$transaction(async (tx) => {
      const c = await visibleContract(tx, ctx.authz, input.contract_id, 'write');
      assertTransition(CONTRACT_FLOW, c.status, 'contract.send_for_signature');
      await reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: c.contactId }, select: { id: true, email: true } }), input.channel);
    });
    return issueLink(this.d, ctx.workspaceId, SIGN_LINK_DAYS, this.clock.now());
  }

  async execute(ctx: ActionContext, input: SendIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<SendOut>> {
    const l = prepared as IssuedLink;
    await lockStageFamilyOf(tx, 'contract', input.contract_id);
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    const to = assertTransition(CONTRACT_FLOW, c.status, 'contract.send_for_signature');
    const now = this.clock.now();
    const { m, fmt, contact, business } = await textCtx(this.d, tx, ctx.workspaceId, c);
    const target = await customerConversation(tx, contact, input.channel, `${c.code} · ${contact.name}`, now);
    const signer = await tx.contractSigner.upsert({
      where: { contractId_party: { contractId: c.id, party: 'customer' } },
      create: { id: uuidv7(now.getTime()), contractId: c.id, party: 'customer', name: contact.name, email: contact.email, phone: contact.phone, otpChannel: input.channel, createdAt: now },
      update: { name: contact.name, email: contact.email, phone: contact.phone, otpChannel: input.channel, otpHash: null, otpExpiresAt: null, otpFails: 0 },
    });
    await saveLink(tx, c.id, signer.id, l, now);
    const text = interpolate(m.signMessage, { customer: contact.name, business, code: c.code, value: fmt.money(String(c.value)), expires: fmt.date(l.expiresAt), link: l.url });
    const sent = await postToCustomer(ctx, tx, this.members, { ...target, text, now });
    await moveContract(tx, c, to, { sentAt: now, sentChannel: input.channel, conversationId: target.conv.id, signLinkExpiresAt: l.expiresAt }, now);
    await logSignEvent(tx, { contractId: c.id, signerId: signer.id, type: 'sent', actorName: await actorNameOf(ctx, this.members), docSha256: c.fileSha256, meta: { channel: input.channel }, at: now });
    await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_sent', params: { code: c.code, value: fmt.money(String(c.value)) }, actor: actorOf(ctx), ref: { type: 'contract', id: c.id }, at: now });
    const stage = await applyStageRule(tx, { contactId: c.contactId, mode: 'raise', to: 'contract', actor: actorOf(ctx), now });
    return {
      result: { contract_id: c.id, sign_url: l.url, expires_at: l.expiresAt.toISOString() },
      events: [{ topic: 'contract.sent_for_signature', payload: { contract_id: c.id, contact_id: c.contactId, code: c.code } }, ...sent.events, ...stage],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(ctx: ActionContext, input: SendIn, tx: TenantTx) {
    return sendPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone, this.d);
  }
}

/** Tin vào hội thoại đã gửi ký (nhắc / gia hạn). Chưa gửi ký lần nào → 409. */
async function notifyCustomer(ctx: ActionContext, tx: TenantTx, d: ContractDeps, members: CrmMembers, c: ContractRecord, text: string, now: Date) {
  const conv = c.conversationId ? await tx.conversation.findUnique({ where: { id: c.conversationId } }) : null;
  if (!conv) throw new AppError('INVALID_STATE', 409, { sent: 'not_sent' });
  return postToCustomer(ctx, tx, members, { conv, created: false, text, now });
}

@Injectable()
@ActionHandler('contract.remind_signer')
export class ContractRemindHandler implements Handler<ActionInput<typeof contractRemindSigner>, { contract_id: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractRemindSigner>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string }>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.remind_signer');
    const now = this.clock.now();
    const live = await liveToken(tx, this.d, c.id, now);
    if (!live) throw new AppError('INVALID_STATE', 409, { sign_link: 'expired' });
    const { m, fmt } = await textCtx(this.d, tx, ctx.workspaceId, c);
    const text = interpolate(m.remind, { code: c.code, expires: fmt.date(live.expiresAt), link: signUrl(this.d.need('env').appBase, live.token) });
    const sent = await notifyCustomer(ctx, tx, this.d, this.members, c, text, now);
    await logSignEvent(tx, { contractId: c.id, type: 'reminded', actorName: await actorNameOf(ctx, this.members), at: now });
    return { result: { contract_id: c.id }, events: sent.events, afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out) };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractRemindSigner>, tx: TenantTx) {
    return remindPreview(ctx, tx, input, this.clock.now());
  }
}

@Injectable()
@ActionHandler('contract.extend_sign_link')
export class ContractExtendLinkHandler implements Handler<ActionInput<typeof contractExtendSignLink>, { contract_id: string; expires_at: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractExtendSignLink>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string; expires_at: string }>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.extend_sign_link');
    const now = this.clock.now();
    const t = await tx.contractSignToken.findFirst({ where: { contractId: c.id, usedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!t) throw new AppError('INVALID_STATE', 409, { sign_link: 'not_sent' });
    const { timeZone } = await this.d.place(ctx.workspaceId);
    // Dời từ hạn hiện tại (hoặc hôm nay nếu đã quá) thêm N ngày, tính tới cuối ngày giờ workspace.
    const expiresAt = dayEndAfter(t.expiresAt > now ? t.expiresAt : now, input.days ?? SIGN_LINK_DAYS, timeZone);
    await tx.contractSignToken.update({ where: { id: t.id }, data: { expiresAt } });
    await this.d.need('platform').tenantSignRoute.updateMany({ where: { tokenHash: t.tokenHash }, data: { expiresAt } });
    await tx.contract.update({ where: { id: c.id }, data: { signLinkExpiresAt: expiresAt, updatedAt: now } });
    await logSignEvent(tx, { contractId: c.id, type: 'link_extended', actorName: await actorNameOf(ctx, this.members), meta: { expires_at: expiresAt.toISOString() }, at: now });
    const live = await liveToken(tx, this.d, c.id, now);
    const { m, fmt } = await textCtx(this.d, tx, ctx.workspaceId, c);
    const result = { contract_id: c.id, expires_at: expiresAt.toISOString() };
    if (!live || !c.conversationId) return { result };
    const sent = await notifyCustomer(ctx, tx, this.d, this.members, c, interpolate(m.extended, { code: c.code, expires: fmt.date(expiresAt), link: signUrl(this.d.need('env').appBase, live.token) }), now);
    return { result, events: sent.events, afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out) };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractExtendSignLink>, tx: TenantTx) {
    return extendPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone);
  }
}

@Injectable()
@ActionHandler('contract.terminate')
export class ContractTerminateHandler implements Handler<ActionInput<typeof contractTerminate>, { contract_id: string; status: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractTerminate>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string; status: string }>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    const to = assertTransition(CONTRACT_FLOW, c.status, 'contract.terminate');
    const now = this.clock.now();
    const reason = input.reason.trim();
    await moveContract(tx, c, to, { terminatedReason: reason, decidedAt: now }, now);
    await logSignEvent(tx, { contractId: c.id, type: 'terminated', actorName: await actorNameOf(ctx, this.members), meta: { reason }, at: now });
    await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_terminated', params: { code: c.code, reason: reason.slice(0, 200) }, actor: actorOf(ctx), ref: { type: 'contract', id: c.id }, at: now });
    return {
      result: { contract_id: c.id, status: to },
      events: [{ topic: 'contract.terminated', payload: { contract_id: c.id, contact_id: c.contactId, code: c.code, reason } }],
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractTerminate>, tx: TenantTx) {
    return terminatePreview(ctx, tx, input);
  }
}
