// Preview đề nghị thanh toán (TIP-023b R2.8): tạo → khách + loại + số tiền (chuỗi VND) + hạn (mặc định +7 ngày giờ workspace) + đơn gắn
// (còn phải thu sau các đề nghị đang mở — vượt → 422 như execute; đơn sàn / đã huỷ → 409); huỷ (risk money) → mã + số tiền + lý do, đã có
// khoản thu → 409 (phải hoàn tiền). Chỉ đọc — không khoá đơn, không cấp mã TT-.
import type { ActionInput, ActionPreview, invoiceCreate, invoiceSendPaymentQr, invoiceVoid } from '@appchat/actions';
import { AppError, INVOICE_DUE_DAYS, INVOICE_FLOW, assertTransition, createFmt } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { editableContact } from '../../../crm/public';
import { visibleOrder } from '../../orders/order-access';
import { visibleInvoice, type InvoiceRecord } from '../invoice-access';
import { localDay } from '../services/payment-write';

const DAY = 86_400_000;
export const money = (v: string | bigint) => createFmt({ locale: 'vi' }).money(String(v));

/** `TT-1001 · Chị Lan` — mã + khách. */
export async function label(tx: TenantTx, i: Pick<InvoiceRecord, 'code' | 'contactId'>) {
  return line(i.code, (await tx.contact.findUnique({ where: { id: i.contactId }, select: { name: true } }))?.name);
}

export async function createPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof invoiceCreate>, now: Date, timeZone: string): Promise<ActionPreview> {
  const amount = BigInt(i.amount);
  let order: string | undefined;
  let contact: string;
  if (i.order_id) {
    const o = await visibleOrder(tx, ctx.authz, i.order_id, 'write');
    if (o.source === 'marketplace' || o.status === 'cancelled') throw new AppError('INVALID_STATE', 409, { order_id: o.source === 'marketplace' ? 'marketplace' : 'cancelled' });
    if (o.contactId !== i.contact_id) throw new AppError('VALIDATION_FAILED', 422, { contact_id: 'order_mismatch' });
    const open = await tx.invoice.findMany({ where: { orderId: o.id, status: { in: ['draft', 'sent', 'partial', 'overdue'] } }, select: { amount: true, paidAmount: true } });
    if (amount > o.total - o.paidTotal - open.reduce((a, x) => a + (x.amount - x.paidAmount), 0n)) throw new AppError('VALIDATION_FAILED', 422, { amount: 'invoice.amount_over' });
    order = o.code;
    contact = (await tx.contact.findUnique({ where: { id: o.contactId }, select: { name: true } }))?.name ?? '';
  } else contact = (await editableContact(tx, ctx.authz, i.contact_id)).contact.name;
  const due = i.due_date ?? localDay(new Date(now.getTime() + INVOICE_DUE_DAYS * DAY), timeZone);
  if (due < localDay(now, timeZone)) throw new AppError('VALIDATION_FAILED', 422, { due_date: 'past' });
  return preview('write', line(contact, money(amount)), { changes: [created('invoice', { contact, order, kind: i.kind, amount: i.amount, due_date: due, title: i.title?.trim() || undefined })] });
}

export async function voidPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof invoiceVoid>): Promise<ActionPreview> {
  const inv = await visibleInvoice(tx, ctx.authz, i.invoice_id, 'write');
  if (inv.paidAmount > 0n) throw new AppError('INVALID_STATE', 409, { invoice_id: 'paid' });
  const to = assertTransition(INVOICE_FLOW, inv.status, 'invoice.void');
  return preview('money', line(await label(tx, inv), money(inv.amount)), { changes: updated('invoice', inv.id, { status: inv.status, reason: null }, { status: to, reason: i.reason.trim() }) });
}

/** Gửi đề nghị (risk send): mã + khách + còn phải thu; tin qua kênh (lần đầu kèm PDF, sau là nhắc) + trạng thái trước / sau. Trạng thái không
 * gửi được → 409 như execute. Không render PDF, không đăng tin. */
export async function sendPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof invoiceSendPaymentQr>): Promise<ActionPreview> {
  const inv = await visibleInvoice(tx, ctx.authz, i.invoice_id, 'write');
  const to = assertTransition(INVOICE_FLOW, inv.status, 'invoice.send_payment_qr');
  const first = inv.status === 'draft';
  const due = String(inv.amount - inv.paidAmount);
  return preview('send', line(await label(tx, inv), money(due)), {
    changes: [{ entity: 'message', after: { channel: i.channel, invoice: inv.code, amount: due, attachment: first ? 'pdf' : null } }, ...updated('invoice', inv.id, { status: inv.status }, { status: to })],
    warnings: [first ? 'first_send' : 'reminder'],
  });
}
