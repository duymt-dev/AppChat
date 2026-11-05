// order.send_confirmation (TIP-032b P2, COMMERCE §4): gửi PDF xác nhận đơn (dòng hàng, tổng, đã thu / còn lại, trạng thái thanh toán) vào
// hội thoại của khách. Kênh = input → kênh hội thoại của đơn → Zalo. PDF render NGOÀI transaction (`prepare`, LibreOffice chậm) và lưu
// tệp; webchat phát link công khai sau khi tệp đã lưu. Trong transaction: khoá đơn (scope), đơn huỷ → INVALID_STATE, ghi tin qua outbox
// + hàng gửi kênh (afterCommit), timeline khách. Không tự gửi lại khi kênh lỗi — tin ở Hộp thư hiện trạng thái gửi (failed → gửi lại tay).
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, interpolate, serverMessages, createFmt } from '@appchat/shared';
import type { ActionInput, orderSendConfirmation } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { ChannelSendQueue } from '../../../channels/public';
import { CrmMembers, actorUserId, writeTimeline } from '../../../crm/public';
import { enqueueOutgoing } from '../../../inbox/public';
import { lockOrder, visibleOrder, type OrderRecord } from '../order-access';
import { actorOf } from '../services/order-write';
import { QuoteDeps } from '../../quotes/services/quote-deps';
import { pdfLinkOf } from '../../quotes/services/quote-env';
import { customerConversation, postToCustomer, reachCustomer, type QuoteChannel } from '../../quotes/services/quote-send';
import { issueDocumentLink } from '../../documents/document-link';
import { orderConfirmationHtml } from '../../documents/order-confirmation-doc';

type In = ActionInput<typeof orderSendConfirmation>;
type Out = { order_id: string; message_id: string; conversation_id: string; channel: string };
interface Prepared {
  file: { fileId: string; name: string };
  text: string;
  link: string | null;
  channel: QuoteChannel;
}

/** Kênh gửi: input → kênh hội thoại của đơn → Zalo cá nhân. */
async function channelOf(tx: TenantTx, o: OrderRecord, input: In): Promise<QuoteChannel> {
  if (input.channel) return input.channel;
  const conv = o.conversationId ? await tx.conversation.findUnique({ where: { id: o.conversationId }, select: { channelType: true } }) : null;
  return conv && ['zalo_personal', 'email', 'webchat'].includes(conv.channelType) ? (conv.channelType as QuoteChannel) : 'zalo_personal';
}

const live = (o: OrderRecord) => {
  if (o.status === 'cancelled') throw new AppError('INVALID_STATE', 409, { status: o.status });
};

@Injectable()
@ActionHandler('order.send_confirmation')
export class OrderSendConfirmationHandler implements Handler<In, Out> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: In): Promise<Prepared> {
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'order.send_confirmation'));
    const { o, channel } = await db.$transaction(async (tx) => {
      const o = await visibleOrder(tx, ctx.authz, input.order_id);
      live(o);
      const channel = await channelOf(tx, o, input);
      await reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: o.contactId }, select: { id: true, email: true } }), channel);
      return { o, channel };
    });
    if (!this.d.renderer || !this.d.files) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'unavailable' });
    const { locale, timeZone } = await this.d.place(ctx.workspaceId);
    const bp = await this.d.need('platform').businessProfile.findUnique({ where: { workspaceId: ctx.workspaceId }, select: { legalName: true } });
    const business = bp?.legalName ?? '';
    const pdf = await this.d.renderer.htmlPdf(await orderConfirmationHtml(db, o, { locale, timeZone, business }));
    const m = serverMessages(locale).sales.delivery;
    const name = interpolate(m.orderPdfName, { code: o.code });
    const f = await this.d.files.upload(db, ctx.workspaceId, { name, mime: 'application/pdf', body: pdf, purpose: 'document', uploadedBy: actorUserId(ctx) });
    const fmt = createFmt({ locale, timeZone });
    const contact = await db.contact.findUnique({ where: { id: o.contactId }, select: { name: true } });
    const left = o.total - o.paidTotal + o.refundedTotal;
    const text = interpolate(m.orderMessage, { customer: contact?.name ?? '', business, code: o.code, total: fmt.money(String(o.total)), paid: fmt.money(String(o.paidTotal - o.refundedTotal)), left: fmt.money(String(left < 0n ? 0n : left)) });
    const now = this.clock.now();
    const link = channel === 'webchat' ? (await issueDocumentLink(this.d.need('platform'), this.d.need('env'), { ws: ctx.workspaceId, kind: 'order_confirmation', documentId: o.id, version: 1, fileId: f.id, now })).url : null;
    return { file: { fileId: f.id, name }, text: link ? `${text}\n${interpolate(m.link, { link })}` : text, link, channel };
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const p = prepared as Prepared;
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    live(o);
    const now = this.clock.now();
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: o.contactId }, select: { id: true, name: true, email: true, ownerUserId: true } });
    const target = await customerConversation(tx, contact, p.channel, `${o.code} · ${contact.name}`, now);
    await tx.file.updateMany({ where: { id: p.file.fileId }, data: { confirmed: true } });
    const env = this.d.need('env');
    const sent = await postToCustomer(ctx, tx, this.members, { ...target, text: p.text, attachments: [{ url: pdfLinkOf(env, ctx.workspaceId, p.file.fileId), mime: 'application/pdf', name: p.file.name, fileId: p.file.fileId }], now });
    await writeTimeline(tx, { contactId: o.contactId, type: 'order', key: 'order_confirmation_sent', params: { code: o.code, channel: p.channel }, actor: actorOf(ctx), ref: { type: 'order', id: o.id }, at: now });
    return {
      result: { order_id: o.id, message_id: sent.out.messageId, conversation_id: target.conv.id, channel: p.channel },
      events: [{ topic: 'order.confirmation_sent', payload: { order_id: o.id, contact_id: o.contactId, code: o.code, channel: p.channel } }, ...sent.events],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    const o = await visibleOrder(tx, ctx.authz, input.order_id);
    live(o);
    const channel = await channelOf(tx, o, input);
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: o.contactId }, select: { id: true, name: true, email: true } });
    const reach = await reachCustomer(tx, contact, channel);
    return preview('send', line(o.code, contact.name), {
      changes: [{ entity: 'message', after: { kind: 'order_confirmation', order: o.code, channel, to: reach.conv ? (reach.conv.title ?? contact.name) : reach.to } }],
      ...(reach.conv ? {} : { warnings: ['new_email_thread'] }),
    });
  }
}
