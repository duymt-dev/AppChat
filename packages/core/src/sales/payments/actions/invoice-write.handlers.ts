// invoice.create · send_payment_qr · void (COMMERCE §5, state-machine §6). Tạo: gắn đơn (không phải đơn sàn / đã huỷ — §4b) thì số tiền
// ≤ còn phải thu của đơn trừ các đề nghị đang mở, phụ trách theo đơn; hạn mặc định +7 ngày theo giờ workspace; mã `TT-{n}`; hoàn tác
// khi còn nháp. Gửi: PDF render NGOÀI transaction (`prepare`), nháp → đã gửi + tin kèm PDF vào hội thoại của khách; đã gửi → nhắc
// (chữ). Huỷ: chỉ khi chưa có khoản thu (đã thu → hoàn tiền), bắt buộc lý do.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, INVOICE_DUE_DAYS, INVOICE_FLOW, assertTransition, createFmt } from '@appchat/shared';
import type { ActionInput, invoiceCreate, invoiceSendPaymentQr, invoiceVoid } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { nextCode } from '../../../kernel/sequence';
import { ChannelSendQueue } from '../../../channels/public';
import { CrmMembers, actorUserId, editableContact, writeTimeline } from '../../../crm/public';
import { enqueueOutgoing } from '../../../inbox/public';
import { lockOrder } from '../../orders/order-access';
import { actorOf } from '../../orders/services/order-write';
import { QuoteDeps } from '../../quotes/services/quote-deps';
import { lockInvoice, visibleInvoice } from '../invoice-access';
import { prepareInvoiceDelivery, type InvoiceDelivery } from '../services/invoice-delivery';
import { invoiceText, postInvoice } from '../services/invoice-send';
import { localDay } from '../services/payment-write';
import { defaultTemplateOf } from '../services/invoice-doc';
import { createPreview, sendPreview, voidPreview } from '../previews/invoice-write.handlers.preview';
import { soleTeamOf } from '../../../authz/data-access';
import { lockContactRow } from '../../../kernel/ownership/root-lock';
import { inSameFamily } from '../../../crm/lifecycle/family-sql';

const DAY = 86_400_000;
type St = { invoice_id: string; status: string };

const invoicePayload = (i: { id: string; contactId: string; orderId: string | null; code: string; amount: bigint; status: string }) => ({
  invoice_id: i.id,
  contact_id: i.contactId,
  order_id: i.orderId,
  code: i.code,
  amount: String(i.amount),
  status: i.status,
});

/** Còn phải thu của đơn sau các đề nghị đang mở (chưa thu hết) — chống tạo trùng vượt tổng đơn. */
async function orderRoom(tx: TenantTx, o: { id: string; total: bigint; paidTotal: bigint }) {
  const open = await tx.invoice.findMany({ where: { orderId: o.id, status: { in: ['draft', 'sent', 'partial', 'overdue'] } }, select: { amount: true, paidAmount: true } });
  return o.total - o.paidTotal - open.reduce((a, i) => a + (i.amount - i.paidAmount), 0n);
}

@Injectable()
@ActionHandler('invoice.create')
export class InvoiceCreateHandler implements Handler<ActionInput<typeof invoiceCreate>, { invoice_id: string; code: string }> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof invoiceCreate>, tx: TenantTx): Promise<HandlerOutcome<{ invoice_id: string; code: string }>> {
    const amount = BigInt(input.amount);
    // TIP-015f §2.5–§2.6: khách → đơn → đề nghị (không khoá khách sau khoá đơn); khách đã xoá → 404, không đề nghị thanh toán mới.
    await lockContactRow(tx, input.contact_id);
    const live = await tx.contact.findUnique({ where: { id: input.contact_id }, select: { deletedAt: true, mergedIntoId: true } }).catch(() => null);
    if (!live || live.deletedAt || live.mergedIntoId) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    const order = input.order_id ? await lockOrder(tx, ctx.authz, input.order_id) : null;
    if (order) {
      if (order.source === 'marketplace' || order.status === 'cancelled') throw new AppError('INVALID_STATE', 409, { order_id: order.source === 'marketplace' ? 'marketplace' : 'cancelled' });
      if (!(await inSameFamily(tx, order.contactId, input.contact_id))) throw new AppError('VALIDATION_FAILED', 422, { contact_id: 'order_mismatch' });
      if (amount > (await orderRoom(tx, order))) throw new AppError('VALIDATION_FAILED', 422, { amount: 'invoice.amount_over' });
    } else await editableContact(tx, ctx.authz, input.contact_id);
    const now = this.clock.now();
    const { timeZone } = await this.d.place(ctx.workspaceId);
    const due = input.due_date ?? localDay(new Date(now.getTime() + INVOICE_DUE_DAYS * DAY), timeZone);
    if (due < localDay(now, timeZone)) throw new AppError('VALIDATION_FAILED', 422, { due_date: 'past' });
    const id = uuidv7(now.getTime());
    const code = await nextCode(tx, 'invoice');
    const actor = actorOf(ctx);
    // Mẫu đã dùng (templates.md §2, TIP-028b): chụp mẫu mặc định lúc tạo — PDF gửi sau render đúng mẫu này dù mặc định đổi.
    const tpl = await defaultTemplateOf(tx, 'payment_request');
    const row = await tx.invoice.create({
      data: {
        id,
        code,
        orderId: order?.id ?? null,
        contactId: input.contact_id,
        ownerUserId: order ? order.ownerUserId : actorUserId(ctx),
        // DC-299: theo đơn (lineage); không gắn đơn → nhóm duy nhất của người tạo.
        teamId: order ? order.teamId : await soleTeamOf(tx, actorUserId(ctx)),
        kind: input.kind,
        title: input.title?.trim() ?? '',
        amount,
        dueDate: new Date(`${due}T00:00:00Z`),
        note: input.note ?? '',
        templateId: tpl?.templateId ?? null,
        templateVersion: tpl?.templateVersion ?? null,
        createdByType: actor.type,
        createdById: actor.id,
        createdAt: now,
        updatedAt: now,
      },
    });
    return { result: { invoice_id: id, code }, before: { id }, events: [{ topic: 'invoice.created', payload: invoicePayload(row) }] };
  }

  /** Chỉ khi còn nháp, chưa có khoản thu. */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id } = log.before as { id: string };
    await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${id}::uuid FOR UPDATE`;
    const i = await tx.invoice.findUnique({ where: { id }, include: { payments: { select: { id: true } } } });
    if (!i) return;
    if (i.status !== 'draft' || i.payments.length) throw new AppError('CONFLICT', 409, { invoice_id: 'changed' });
    await tx.invoice.delete({ where: { id } });
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof invoiceCreate>, tx: TenantTx) {
    return createPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone);
  }
}

type SendIn = ActionInput<typeof invoiceSendPaymentQr>;
type Prepared = InvoiceDelivery;
const NONE: Prepared = { file: null, qrFileId: null, link: null };

@Injectable()
@ActionHandler('invoice.send_payment_qr')
export class InvoiceSendHandler implements Handler<SendIn, St> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Lần gửi đầu: PDF có VietQR + ảnh QR + link công khai webchat (ngoài transaction — LibreOffice chậm). Nhắc: không render lại. */
  async prepare(ctx: ActionContext, input: SendIn): Promise<Prepared> {
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'invoice.send_payment_qr'));
    const i = await db.$transaction((tx) => visibleInvoice(tx, ctx.authz, input.invoice_id, 'write'));
    assertTransition(INVOICE_FLOW, i.status, 'invoice.send_payment_qr');
    if (i.status !== 'draft' && i.fileId) return NONE;
    return prepareInvoiceDelivery(ctx, db, this.d, i, input.channel, this.clock.now());
  }

  async execute(ctx: ActionContext, input: SendIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<St>> {
    const p = (prepared ?? NONE) as Prepared;
    const i = await lockInvoice(tx, ctx.authz, input.invoice_id);
    const to = assertTransition(INVOICE_FLOW, i.status, 'invoice.send_payment_qr');
    const now = this.clock.now();
    const first = i.status === 'draft';
    const text = await invoiceText(tx, this.d, ctx.workspaceId, i, first ? 'first' : 'remind', now);
    const sent = await postInvoice(ctx, tx, this.d, this.members, i, { channel: input.channel, text, ...(p.file ? { file: p.file } : {}), qrFileId: p.qrFileId, link: p.link, now });
    const files = [p.file?.fileId, p.qrFileId].filter((x): x is string => !!x);
    if (files.length) await tx.file.updateMany({ where: { id: { in: files } }, data: { confirmed: true } });
    const actor = actorOf(ctx);
    const reminders = first ? (i.remindersSent as unknown[]) : [...(i.remindersSent as unknown[]), { key: 'manual', at: now.toISOString(), channel: input.channel, by: actor.id }];
    await tx.invoice.update({
      where: { id: i.id },
      data: {
        status: to,
        conversationId: sent.conversationId,
        remindersSent: reminders as object[],
        version: { increment: 1 },
        updatedAt: now,
        ...(first ? { sentAt: now, sentChannel: input.channel, sentById: actor.id } : {}),
        ...(p.file ? { fileId: p.file.fileId } : {}),
      },
    });
    const { locale, timeZone } = await this.d.place(ctx.workspaceId);
    if (first)
      await writeTimeline(tx, { contactId: i.contactId, type: 'invoice', key: 'invoice_sent', params: { code: i.code, amount: createFmt({ locale, timeZone }).money(String(i.amount)) }, actor, ref: { type: 'invoice', id: i.id }, at: now });
    return {
      result: { invoice_id: i.id, status: to },
      events: [...(first ? [{ topic: 'invoice.sent', payload: invoicePayload({ ...i, status: to }) }] : []), ...sent.events],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(ctx: ActionContext, input: SendIn, tx: TenantTx) {
    return sendPreview(ctx, tx, input, this.d.doc(), this.clock.now());
  }
}

@Injectable()
@ActionHandler('invoice.void')
export class InvoiceVoidHandler implements Handler<ActionInput<typeof invoiceVoid>, St> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof invoiceVoid>, tx: TenantTx): Promise<HandlerOutcome<St>> {
    const i = await lockInvoice(tx, ctx.authz, input.invoice_id);
    if (i.paidAmount > 0n) throw new AppError('INVALID_STATE', 409, { invoice_id: 'paid' });
    const to = assertTransition(INVOICE_FLOW, i.status, 'invoice.void');
    const now = this.clock.now();
    const actor = actorOf(ctx);
    await tx.invoice.update({ where: { id: i.id }, data: { status: to, voidReason: input.reason, voidedAt: now, voidedById: actor.id, version: { increment: 1 }, updatedAt: now } });
    await writeTimeline(tx, { contactId: i.contactId, type: 'invoice', key: 'invoice_void', params: { code: i.code, reason: input.reason }, actor, ref: { type: 'invoice', id: i.id }, at: now });
    return { result: { invoice_id: i.id, status: to }, events: [{ topic: 'invoice.voided', payload: invoicePayload({ ...i, status: to }) }] };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof invoiceVoid>, tx: TenantTx) {
    return voidPreview(ctx, tx, input);
  }
}
