// contract.appendix_send (TIP-030b F3 spec 15–16): chỉ sau khi Owner đã ký phụ lục (`pending_signature`) — link ký một lần 7 ngày, token
// gắn phụ lục + version + digest đóng băng + người ký phía khách (`appendix_signer` customer, OTP qua đúng kênh đó). Tin gửi qua outbox kênh
// sẵn có (biên nhận ổn định — gửi lại không nhân đôi). Link cũ của phụ lục bị vô hiệu khi phát link mới.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { APPENDIX_FLOW, AppError, SIGN_LINK_DAYS, assertTransition, createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, contractAppendixSend } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, actorUserId } from '../../crm/public';
import { enqueueOutgoing } from '../../inbox/public';
import { customerConversation, postToCustomer, reachCustomer } from '../../sales/public';
import { ContractDeps } from '../services/contract-deps';
import { lockAppendix, moveAppendix, visibleAppendix } from './access';
import { logAppendixEvent } from './events';
import { issueAppendixLink, saveAppendixLink, type IssuedAppendixLink } from './tokens';

type In = ActionInput<typeof contractAppendixSend>;
type Out = { appendix_id: string; sign_url: string; expires_at: string };

@Injectable()
@ActionHandler('contract.appendix_send')
export class ContractAppendixSendHandler implements Handler<In, Out> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Kiểm trạng thái + kênh nhận của khách rồi phát link (định tuyến nền tảng). */
  async prepare(ctx: ActionContext, input: In): Promise<IssuedAppendixLink> {
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.appendix_send'));
    await db.$transaction(async (tx) => {
      const { a, c } = await visibleAppendix(tx, ctx.authz, input.appendix_id);
      assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_send');
      await reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: c.contactId }, select: { id: true, email: true } }), input.channel);
    });
    return issueAppendixLink(this.d, ctx.workspaceId, SIGN_LINK_DAYS, this.clock.now());
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _p?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const l = prepared as IssuedAppendixLink;
    const { a, c } = await lockAppendix(tx, ctx.authz, input.appendix_id);
    const to = assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_send');
    if (!a.fileSha256) throw new AppError('INVALID_STATE', 409, { appendix: 'not_frozen' });
    const now = this.clock.now();
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: c.contactId }, select: { id: true, name: true, email: true, phone: true, ownerUserId: true } });
    const target = await customerConversation(tx, contact, input.channel, `${a.code} · ${contact.name}`, now);
    const signer = await tx.appendixSigner.upsert({
      where: { appendixId_party: { appendixId: a.id, party: 'customer' } },
      create: { id: uuidv7(now.getTime()), appendixId: a.id, party: 'customer', appendixVersion: a.version, documentHash: a.fileSha256, name: contact.name, email: contact.email, phone: contact.phone, otpChannel: input.channel, createdAt: now },
      update: { appendixVersion: a.version, documentHash: a.fileSha256, name: contact.name, email: contact.email, phone: contact.phone, otpChannel: input.channel, otpHash: null, otpExpiresAt: null, otpFails: 0 },
    });
    await saveAppendixLink(tx, { id: a.id, version: a.version, fileSha256: a.fileSha256 }, signer.id, l, now);
    const p = await this.d.place(ctx.workspaceId);
    const fmt = createFmt({ locale: p.locale, timeZone: p.timeZone });
    const bp = await this.d.need('platform').businessProfile.findUnique({ where: { workspaceId: ctx.workspaceId }, select: { legalName: true } });
    const m = serverMessages(p.locale).sales.contract.appendix;
    const text = interpolate(m.signMessage, { customer: contact.name, business: bp?.legalName ?? p.name, code: a.code, contract: c.code, expires: fmt.date(l.expiresAt), link: l.url });
    const sent = await postToCustomer(ctx, tx, this.members, { ...target, text, now });
    await moveAppendix(tx, a, to, { sentAt: now, sentChannel: input.channel, conversationId: target.conv.id, signLinkExpiresAt: l.expiresAt }, now);
    const me = actorUserId(ctx);
    const name = me ? ((await this.members.names([me])).get(me) ?? '') : '';
    await logAppendixEvent(tx, { appendixId: a.id, version: a.version, type: 'sent', party: 'customer', signerId: signer.id, actorName: name, docSha256: a.fileSha256, meta: { channel: input.channel }, at: now });
    return {
      result: { appendix_id: a.id, sign_url: l.url, expires_at: l.expiresAt.toISOString() },
      events: sent.events,
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    const { a, c } = await visibleAppendix(tx, ctx.authz, input.appendix_id);
    const to = assertTransition(APPENDIX_FLOW, a.status, 'contract.appendix_send');
    const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } });
    return preview('send', line(a.code, contact?.name), { changes: updated('appendix', a.id, { status: a.status }, { status: to, channel: input.channel }) });
  }
}
