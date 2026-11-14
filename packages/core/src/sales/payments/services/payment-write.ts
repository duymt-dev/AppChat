// Ghi khoản thu dùng chung (ghi nhận tay, khớp webhook ngân hàng, đối soát, tiền sàn — COMMERCE §5, §4b; concurrency §3): sổ
// `customer_payment` chỉ thêm, phiếu thu `PT-{n}` cho mọi khoản dương, cộng `invoice.paid_amount` (trạng thái suy ra — invoiceStatusOf)
// + `order.paid_total` → `pay_status` (payCols), nhật ký đơn (`deposit` / `paid`), timeline khách, sinh liệu trình khi đơn đủ điều kiện
// (§6). Người gọi đã khoá dòng đề nghị (lockInvoice / FOR UPDATE) và ghi outbox cùng transaction. Đổi điểm (TIP-036 `payment.redeem_points`)
// đi cùng đường: kind / method `points`; hoàn tác ghi bù (khoản thu → failed, không xoá — `voidPointsPayment`).
import { AppError, INVOICE_PAYABLE, invoiceStatusOf, type InvoiceStatusKey } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { nextCode } from '../../../kernel/sequence';
import { writeTimeline } from '../../../crm/public';
import { logEvent, payCols, type Actor } from '../../orders/services/order-write';
import type { InvoiceRecord } from '../invoice-access';
import { grantPackages } from './packages';
import { defaultTemplateOf } from './invoice-doc';

type Ev = { topic: string; payload: Record<string, unknown> };
type Method = 'qr' | 'bank_transfer' | 'cash' | 'card' | 'marketplace' | 'points';

/** Ngày `YYYY-MM-DD` theo giờ workspace. */
export const localDay = (d: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const dueDay = (i: Pick<InvoiceRecord, 'dueDate'>) => i.dueDate.toISOString().slice(0, 10);

/** Trạng thái đề nghị sau khi đổi số đã thu (theo hạn + hôm nay giờ workspace). */
export const statusAfter = (i: Pick<InvoiceRecord, 'status' | 'amount' | 'dueDate'>, paid: bigint, today: string): InvoiceStatusKey =>
  invoiceStatusOf({ status: i.status, amount: i.amount, paid, due: dueDay(i), today });

export interface PaymentIn {
  amount: bigint;
  method: Method;
  reference?: string;
  paidAt: Date;
  bankTxId?: string;
  actor: Actor;
  /** Khoản trả bằng điểm (kind `points`) — mặc định theo loại đề nghị (cọc / thanh toán). */
  kind?: 'points';
}

export interface PaymentOut {
  paymentId: string;
  receiptCode: string;
  status: InvoiceStatusKey;
  events: Ev[];
}

/** Cộng vào đơn (paid_total → pay_status) + nhật ký đơn; trả id nhật ký để hoàn tác. Đơn đã huỷ vẫn ghi (tiền đã vào — chờ hoàn). */
export async function addToOrder(tx: TenantTx, orderId: string, amount: bigint, actor: Actor, now: Date): Promise<{ eventId: string; events: Ev[] }> {
  await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${orderId}::uuid FOR UPDATE`;
  const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  const paidTotal = o.paidTotal + amount;
  const pay = payCols({ ...o, paidTotal });
  await tx.order.update({ where: { id: o.id }, data: { paidTotal, ...pay, updatedAt: now } });
  const eventId = await logEvent(tx, o.id, pay.payStatus === 'paid' ? 'paid' : 'deposit', actor, now, { amount });
  const granted = o.status === 'cancelled' ? [] : await grantPackages(tx, { ...o, paidTotal, payStatus: pay.payStatus }, actor, now);
  return { eventId, events: granted };
}

/** Ghi một khoản thu cho đề nghị (đã khoá). Số tiền ≤ còn phải thu; đề nghị phải còn mở. */
export async function recordInvoicePayment(tx: TenantTx, inv: InvoiceRecord, p: PaymentIn, today: string, now: Date): Promise<PaymentOut & { orderEventId: string | null }> {
  if (!INVOICE_PAYABLE.includes(inv.status)) throw new AppError('INVALID_STATE', 409, { status: inv.status });
  const left = inv.amount - inv.paidAmount;
  if (p.amount > left) throw new AppError('VALIDATION_FAILED', 422, { amount: 'invoice.amount_over' });
  const paymentId = uuidv7(now.getTime());
  const receiptCode = await nextCode(tx, 'receipt');
  // Phiếu thu chụp mẫu mặc định lúc ghi khoản thu (templates.md §2, TIP-028b) — PDF render lần đầu dùng đúng mẫu này.
  const tpl = await defaultTemplateOf(tx, 'receipt');
  await tx.customerPayment.create({
    data: {
      id: paymentId,
      invoiceId: inv.id,
      orderId: inv.orderId,
      contactId: inv.contactId,
      kind: p.kind ?? (inv.kind === 'deposit' ? 'deposit' : 'payment'),
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? '',
      bankTxId: p.bankTxId ?? null,
      status: 'confirmed',
      receiptCode,
      templateId: tpl?.templateId ?? null,
      templateVersion: tpl?.templateVersion ?? null,
      paidAt: p.paidAt,
      createdByType: p.actor.type,
      createdById: p.actor.id,
      createdAt: now,
    },
  });
  const paid = inv.paidAmount + p.amount;
  const status = statusAfter({ ...inv, status: inv.status === 'draft' ? 'sent' : inv.status }, paid, today);
  await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status, version: { increment: 1 }, updatedAt: now } });
  const order = inv.orderId ? await addToOrder(tx, inv.orderId, p.amount, p.actor, now) : null;
  await writeTimeline(tx, { contactId: inv.contactId, type: 'invoice', key: 'invoice_paid', params: { code: inv.code, amount: String(p.amount), receipt: receiptCode }, actor: p.actor, ref: { type: 'invoice', id: inv.id }, at: now });
  const events: Ev[] = [
    { topic: 'payment.confirmed', payload: { payment_id: paymentId, invoice_id: inv.id, order_id: inv.orderId, contact_id: inv.contactId, amount: String(p.amount), method: p.method, receipt_code: receiptCode, status } },
    ...(order?.events ?? []),
  ];
  return { paymentId, receiptCode, status, events, orderEventId: order?.eventId ?? null };
}

/** Hoàn tác một khoản thu (trong cửa sổ hoàn tác): xoá khoản thu + nhật ký đơn, trừ lại số đã thu. Đơn / đề nghị đổi sau đó → 409. */
export async function revertInvoicePayment(tx: TenantTx, b: { invoice_id: string; payment_id: string; order_event_id: string | null; status: InvoiceStatusKey; paid: string }, now: Date) {
  await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${b.invoice_id}::uuid FOR UPDATE`;
  const pay = await tx.customerPayment.findUnique({ where: { id: b.payment_id } });
  const inv = await tx.invoice.findUnique({ where: { id: b.invoice_id } });
  if (!pay || !inv || inv.paidAmount !== BigInt(b.paid) + pay.amount) throw new AppError('CONFLICT', 409, { invoice_id: 'changed' });
  const refunds = await tx.customerPayment.count({ where: { invoiceId: inv.id, kind: 'refund', status: { in: ['pending', 'confirmed'] } } });
  if (refunds) throw new AppError('CONFLICT', 409, { invoice_id: 'refunded' });
  if (inv.orderId) {
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${inv.orderId}::uuid FOR UPDATE`;
    const o = await tx.order.findUniqueOrThrow({ where: { id: inv.orderId } });
    const paidTotal = o.paidTotal - pay.amount;
    if (paidTotal < o.refundedTotal) throw new AppError('CONFLICT', 409, { order_id: 'refunded' });
    await tx.order.update({ where: { id: o.id }, data: { paidTotal, ...payCols({ ...o, paidTotal }), updatedAt: now } });
    if (b.order_event_id) await tx.orderEvent.deleteMany({ where: { id: b.order_event_id } });
    await revokePackages(tx, o.id, paidTotal, o.total);
  }
  if (pay.bankTxId) await tx.bankTx.update({ where: { id: pay.bankTxId }, data: { status: 'needs_review', invoiceId: null, paymentId: null } });
  await tx.customerPayment.delete({ where: { id: pay.id } });
  await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: BigInt(b.paid), status: b.status, version: { increment: 1 }, updatedAt: now } });
}

/** Hoàn tác thu làm đơn hết đủ tiền → gỡ liệu trình vừa sinh (chưa dùng buổi nào). */
async function revokePackages(tx: TenantTx, orderId: string, paidTotal: bigint, total: bigint) {
  if (paidTotal >= total) return;
  await tx.customerPackage.deleteMany({ where: { orderId, usedSessions: 0, usages: { none: {} } } });
}

/**
 * Hoàn tác khoản trả bằng điểm (ghi bù — sổ thu chỉ thêm): khoản thu → `failed` + ghi chú, trừ lại đã thu của đề nghị / đơn, bớt điểm đã
 * dùng trên đơn. Đề nghị / đơn đổi sau đó (thu thêm, hoàn tiền) → 409. Người gọi trả điểm về lô (loyalty `restoreDebit`).
 */
export async function voidPointsPayment(tx: TenantTx, b: { invoice_id: string; payment_id: string; order_event_id: string | null; status: InvoiceStatusKey; paid: string; points: number }, note: string, now: Date) {
  await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${b.invoice_id}::uuid FOR UPDATE`;
  const pay = await tx.customerPayment.findUnique({ where: { id: b.payment_id } });
  const inv = await tx.invoice.findUnique({ where: { id: b.invoice_id } });
  if (!pay || pay.kind !== 'points' || pay.status !== 'confirmed' || !inv || inv.paidAmount !== BigInt(b.paid) + pay.amount) throw new AppError('CONFLICT', 409, { invoice_id: 'changed' });
  if (pay.orderId) {
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${pay.orderId}::uuid FOR UPDATE`;
    const o = await tx.order.findUniqueOrThrow({ where: { id: pay.orderId } });
    const paidTotal = o.paidTotal - pay.amount;
    if (o.status === 'cancelled' || paidTotal < o.refundedTotal || o.pointsUsed < BigInt(b.points)) throw new AppError('CONFLICT', 409, { order_id: 'changed' });
    await tx.order.update({ where: { id: o.id }, data: { paidTotal, pointsUsed: o.pointsUsed - BigInt(b.points), ...payCols({ ...o, paidTotal }), updatedAt: now } });
    if (b.order_event_id) await tx.orderEvent.deleteMany({ where: { id: b.order_event_id } });
  }
  await tx.customerPayment.update({ where: { id: pay.id }, data: { status: 'failed', decidedAt: now, decisionNote: note } });
  await tx.invoice.update({ where: { id: inv.id }, data: { paidAmount: BigInt(b.paid), status: b.status, version: { increment: 1 }, updatedAt: now } });
}
