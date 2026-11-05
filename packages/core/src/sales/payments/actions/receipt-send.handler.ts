// receipt.send (TIP-032b P2, COMMERCE §5): gửi PDF phiếu thu của một khoản thu đã xác nhận vào hội thoại của khách. Kênh = input → kênh
// hội thoại của đề nghị thanh toán → Zalo. PDF đóng băng dùng chung với tải phiếu thu (`ensureReceiptPdf`, ngoài transaction); webchat phát
// link công khai sau khi tệp đã lưu. Trong transaction: khoá đề nghị (scope), khoản thu phải `confirmed` + có mã phiếu thu, ghi tin
// (outbox + hàng gửi kênh afterCommit), timeline khách.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, receiptSend } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { ChannelSendQueue } from '../../../channels/public';
import { CrmMembers, writeTimeline } from '../../../crm/public';
import { enqueueOutgoing } from '../../../inbox/public';
import { actorOf } from '../../orders/services/order-write';
import { QuoteDeps } from '../../quotes/services/quote-deps';
import { pdfLinkOf } from '../../quotes/services/quote-env';
import { customerConversation, postToCustomer, reachCustomer, type QuoteChannel } from '../../quotes/services/quote-send';
import { issueDocumentLink } from '../../documents/document-link';
import { lockInvoice, visibleInvoice, type InvoiceRecord } from '../invoice-access';
import { ensureReceiptPdf } from '../services/receipt-file';
import { UUID } from '../../orders/order-access';

type In = ActionInput<typeof receiptSend>;
type Out = { payment_id: string; receipt_code: string; message_id: string; conversation_id: string; channel: string };
interface Prepared {
  fileId: string;
  name: string;
  text: string;
  channel: QuoteChannel;
}

/** Khoản thu đã xác nhận có phiếu thu + đề nghị (theo scope người gọi). Không thấy → 404. */
async function paymentOf(tx: TenantTx, ctx: ActionContext, paymentId: string, lock = false) {
  const p = UUID.test(paymentId) ? await tx.customerPayment.findUnique({ where: { id: paymentId } }) : null;
  if (!p || !p.invoiceId) throw new AppError('NOT_FOUND', 404, { payment_id: 'not_found' });
  const i = lock ? await lockInvoice(tx, ctx.authz, p.invoiceId) : await visibleInvoice(tx, ctx.authz, p.invoiceId);
  if (p.status !== 'confirmed' || !p.receiptCode || p.amount <= 0n) throw new AppError('INVALID_STATE', 409, { payment_id: p.status });
  return { p, i };
}

async function channelOf(tx: TenantTx, i: InvoiceRecord, input: In): Promise<QuoteChannel> {
  if (input.channel) return input.channel;
  const conv = i.conversationId ? await tx.conversation.findUnique({ where: { id: i.conversationId }, select: { channelType: true } }) : null;
  return conv && ['zalo_personal', 'email', 'webchat'].includes(conv.channelType) ? (conv.channelType as QuoteChannel) : 'zalo_personal';
}

@Injectable()
@ActionHandler('receipt.send')
export class ReceiptSendHandler implements Handler<In, Out> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: In): Promise<Prepared> {
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'receipt.send'));
    const { p, i, channel } = await db.$transaction(async (tx) => {
      const r = await paymentOf(tx, ctx, input.payment_id);
      const channel = await channelOf(tx, r.i, input);
      await reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: r.i.contactId }, select: { id: true, email: true } }), channel);
      return { ...r, channel };
    });
    const f = await ensureReceiptPdf(db, this.d, ctx.workspaceId, i, p);
    if (!f.fileId) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '020' });
    const { locale, timeZone } = await this.d.place(ctx.workspaceId);
    const m = serverMessages(locale).sales.delivery;
    const [contact, bp] = await Promise.all([
      db.contact.findUnique({ where: { id: i.contactId }, select: { name: true } }),
      this.d.need('platform').businessProfile.findUnique({ where: { workspaceId: ctx.workspaceId }, select: { legalName: true } }),
    ]);
    const text = interpolate(m.receiptMessage, { customer: contact?.name ?? '', business: bp?.legalName ?? '', code: p.receiptCode ?? '', amount: createFmt({ locale, timeZone }).money(String(p.amount)), invoice: i.code });
    const now = this.clock.now();
    const link = channel === 'webchat' ? (await issueDocumentLink(this.d.need('platform'), this.d.need('env'), { ws: ctx.workspaceId, kind: 'receipt', documentId: p.id, version: 1, fileId: f.fileId, now })).url : null;
    return { fileId: f.fileId, name: f.name, text: link ? `${text}\n${interpolate(m.link, { link })}` : text, channel };
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const pr = prepared as Prepared;
    const { p, i } = await paymentOf(tx, ctx, input.payment_id, true);
    const now = this.clock.now();
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: i.contactId }, select: { id: true, name: true, email: true, ownerUserId: true } });
    const target = await customerConversation(tx, contact, pr.channel, `${p.receiptCode} · ${contact.name}`, now);
    const env = this.d.need('env');
    const sent = await postToCustomer(ctx, tx, this.members, { ...target, text: pr.text, attachments: [{ url: pdfLinkOf(env, ctx.workspaceId, pr.fileId), mime: 'application/pdf', name: pr.name, fileId: pr.fileId }], now });
    await writeTimeline(tx, { contactId: i.contactId, type: 'invoice', key: 'receipt_sent', params: { code: p.receiptCode ?? '', channel: pr.channel }, actor: actorOf(ctx), ref: { type: 'invoice', id: i.id }, at: now });
    return {
      result: { payment_id: p.id, receipt_code: p.receiptCode ?? '', message_id: sent.out.messageId, conversation_id: target.conv.id, channel: pr.channel },
      events: [{ topic: 'receipt.sent', payload: { payment_id: p.id, invoice_id: i.id, contact_id: i.contactId, code: p.receiptCode, channel: pr.channel } }, ...sent.events],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    const { p, i } = await paymentOf(tx, ctx, input.payment_id);
    const channel = await channelOf(tx, i, input);
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: i.contactId }, select: { id: true, name: true, email: true } });
    const reach = await reachCustomer(tx, contact, channel);
    return preview('send', line(p.receiptCode ?? '', contact.name), {
      changes: [{ entity: 'message', after: { kind: 'receipt', receipt: p.receiptCode, invoice: i.code, channel, to: reach.conv ? (reach.conv.title ?? contact.name) : reach.to } }],
      ...(reach.conv ? {} : { warnings: ['new_email_thread'] }),
    });
  }
}
