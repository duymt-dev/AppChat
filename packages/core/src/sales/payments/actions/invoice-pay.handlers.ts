// invoice.record_payment · resolve_bank_match (COMMERCE §5): ghi nhận tay (tiền mặt / thẻ / chuyển khoản / QR) hoặc gán giao dịch ở hàng
// "Cần đối soát" cho một đề nghị → khoản thu `confirmed` + phiếu thu `PT-{n}`, cộng vào đề nghị + đơn (pay_status), sinh liệu trình khi
// đơn đủ điều kiện. Hoàn tác trong 24 giờ (khi chưa có hoàn tiền). Giao dịch đối soát: số tiền phải ≤ còn phải thu.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, createFmt } from '@appchat/shared';
import type { ActionInput, invoiceRecordPayment, invoiceResolveBankMatch } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { actorOf } from '../../orders/services/order-write';
import { QuoteDeps } from '../../quotes/services/quote-deps';
import { UUID, lockInvoice, visibleInvoice } from '../invoice-access';
import { localDay, recordInvoicePayment, revertInvoicePayment } from '../services/payment-write';
import { bankMatchPreview } from '../previews/invoice-pay.handlers.preview';

type Before = { invoice_id: string; payment_id: string; order_event_id: string | null; status: 'draft' | 'sent' | 'partial' | 'overdue'; paid: string };
type RecordOut = { invoice_id: string; payment_id: string; status: string; receipt_code: string };

/** Ngày khách trả (tay): `YYYY-MM-DD` theo giờ workspace → mốc 12:00 giờ VN của ngày đó; không được ở tương lai. */
function paidAtOf(day: string | undefined, now: Date, today: string): Date {
  if (!day) return now;
  if (day > today) throw new AppError('VALIDATION_FAILED', 422, { paid_at: 'future' });
  return day === today ? now : new Date(`${day}T05:00:00Z`);
}

@Injectable()
@ActionHandler('invoice.record_payment')
export class InvoiceRecordPaymentHandler implements Handler<ActionInput<typeof invoiceRecordPayment>, RecordOut> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof invoiceRecordPayment>, tx: TenantTx): Promise<HandlerOutcome<RecordOut>> {
    const i = await lockInvoice(tx, ctx.authz, input.invoice_id);
    const now = this.clock.now();
    const today = localDay(now, (await this.d.place(ctx.workspaceId)).timeZone);
    const r = await recordInvoicePayment(tx, i, { amount: BigInt(input.amount), method: input.method, reference: [input.reference, input.note].filter(Boolean).join(' · ').slice(0, 200), paidAt: paidAtOf(input.paid_at, now, today), actor: actorOf(ctx) }, today, now);
    const before: Before = { invoice_id: i.id, payment_id: r.paymentId, order_event_id: r.orderEventId, status: i.status as Before['status'], paid: String(i.paidAmount) };
    return { result: { invoice_id: i.id, payment_id: r.paymentId, status: r.status, receipt_code: r.receiptCode }, before, events: r.events };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await revertInvoicePayment(tx, log.before as Before, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof invoiceRecordPayment>, tx: TenantTx) {
    const i = await visibleInvoice(tx, ctx.authz, input.invoice_id);
    return { summary: `${i.code} · ${createFmt({ locale: 'vi' }).money(input.amount)}`, risk: 'money' as const };
  }
}

type MatchOut = { invoice_id: string; payment_id: string; status: string };

@Injectable()
@ActionHandler('invoice.resolve_bank_match')
export class InvoiceResolveBankMatchHandler implements Handler<ActionInput<typeof invoiceResolveBankMatch>, MatchOut> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof invoiceResolveBankMatch>, tx: TenantTx): Promise<HandlerOutcome<MatchOut>> {
    if (!UUID.test(input.bank_tx_id)) throw new AppError('NOT_FOUND', 404, { bank_tx_id: 'not_found' });
    await tx.$queryRaw`SELECT 1 FROM bank_tx WHERE id = ${input.bank_tx_id}::uuid FOR UPDATE`;
    const bt = await tx.bankTx.findUnique({ where: { id: input.bank_tx_id }, include: { feed: { select: { provider: true } } } });
    if (!bt) throw new AppError('NOT_FOUND', 404, { bank_tx_id: 'not_found' });
    if (bt.status !== 'needs_review') throw new AppError('INVALID_STATE', 409, { bank_tx_id: bt.status });
    const i = await lockInvoice(tx, ctx.authz, input.invoice_id);
    const now = this.clock.now();
    const today = localDay(now, (await this.d.place(ctx.workspaceId)).timeZone);
    const r = await recordInvoicePayment(tx, i, { amount: bt.amount, method: 'bank_transfer', reference: `${bt.feed.provider} ${bt.externalId}`.slice(0, 200), paidAt: bt.occurredAt, bankTxId: bt.id, actor: actorOf(ctx) }, today, now);
    await tx.bankTx.update({ where: { id: bt.id }, data: { status: 'resolved', invoiceId: i.id, paymentId: r.paymentId } });
    const before: Before = { invoice_id: i.id, payment_id: r.paymentId, order_event_id: r.orderEventId, status: i.status as Before['status'], paid: String(i.paidAmount) };
    return { result: { invoice_id: i.id, payment_id: r.paymentId, status: r.status }, before, events: r.events };
  }

  /** Gỡ khoản thu, giao dịch quay lại hàng "Cần đối soát". */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await revertInvoicePayment(tx, log.before as Before, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof invoiceResolveBankMatch>, tx: TenantTx) {
    return bankMatchPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone);
  }
}
