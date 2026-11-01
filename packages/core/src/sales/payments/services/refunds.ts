// Hoàn tiền (COMMERCE §4 / §5 / §6, state-machine §7): khoản `kind = refund` số âm, `pending` tới khi người có `payment.refund_approve`
// duyệt (→ confirmed: cộng `order.refunded_total` → pay_status hoàn một phần / toàn bộ, liệu trình → refunded) hoặc từ chối (→ failed).
// Nguồn: yêu cầu tay theo đề nghị / liệu trình (`payment.refund`) và đơn đã thu bị huỷ (consumer `order.cancelled`). Số hoàn ≤ đã thu
// còn lại trừ các yêu cầu đang chờ (không hoàn hai lần).
import { AppError, packageRefundOf } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { UUID } from '../invoice-access';
import { writeTimeline } from '../../../crm/public';
import { logEvent, payCols, type Actor } from '../../orders/services/order-write';

type Ev = { topic: string; payload: Record<string, unknown> };
type Method = 'qr' | 'bank_transfer' | 'cash' | 'card' | 'marketplace';
const ACTIVE = { in: ['pending' as const, 'confirmed' as const] };

const sum = (rows: { amount: bigint }[]) => rows.reduce((a, r) => a + r.amount, 0n);

/** Số còn hoàn được của đơn: đã thu − đã hoàn − đang chờ duyệt. */
export async function orderRefundable(tx: TenantTx, orderId: string): Promise<bigint> {
  const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { paidTotal: true, refundedTotal: true } });
  const pending = sum(await tx.customerPayment.findMany({ where: { orderId, kind: 'refund', status: 'pending' }, select: { amount: true } }));
  return o.paidTotal - o.refundedTotal + pending; // pending là số âm
}

/** Số còn hoàn được của một đề nghị: khoản thu dương đã xác nhận + mọi khoản hoàn (âm — đã duyệt + đang chờ). */
export async function invoiceRefundable(tx: TenantTx, invoiceId: string): Promise<bigint> {
  const rows = await tx.customerPayment.findMany({ where: { invoiceId, OR: [{ kind: { not: 'refund' }, status: 'confirmed' }, { kind: 'refund', status: ACTIVE }] }, select: { amount: true } });
  return sum(rows);
}

/** Phần tiền của liệu trình (theo dòng đơn, gồm thuế) × tỉ lệ buổi còn lại. */
export async function packageRefundable(tx: TenantTx, p: { orderId: string; productId: string; totalSessions: number; usedSessions: number }): Promise<bigint> {
  const item = await tx.orderItem.findFirst({ where: { orderId: p.orderId, productId: p.productId }, select: { lineTotal: true, taxRate: true } });
  if (!item) return 0n;
  const gross = (item.lineTotal * BigInt(100 + item.taxRate)) / 100n;
  return packageRefundOf(gross, p.totalSessions, p.usedSessions);
}

export interface RefundIn {
  contactId: string;
  orderId: string | null;
  invoiceId: string | null;
  packageId: string | null;
  amount: bigint;
  method: Method;
  reason: string;
  actor: Actor;
}

/** Ghi yêu cầu hoàn (pending) + nhật ký đơn / timeline. Người gọi đã khoá đơn / đề nghị và kiểm số hoàn được. */
export async function requestRefund(tx: TenantTx, r: RefundIn, now: Date): Promise<{ paymentId: string; events: Ev[] }> {
  if (r.amount <= 0n) throw new AppError('VALIDATION_FAILED', 422, { amount: 'nothing_to_refund' });
  const paymentId = uuidv7(now.getTime());
  await tx.customerPayment.create({
    data: {
      id: paymentId,
      invoiceId: r.invoiceId,
      orderId: r.orderId,
      contactId: r.contactId,
      packageId: r.packageId,
      kind: 'refund',
      amount: -r.amount,
      method: r.method,
      status: 'pending',
      paidAt: now,
      reason: r.reason,
      createdByType: r.actor.type,
      createdById: r.actor.id,
      createdAt: now,
    },
  });
  await writeTimeline(tx, { contactId: r.contactId, type: 'payment', key: 'refund_requested', params: { amount: String(r.amount), reason: r.reason }, actor: r.actor, ref: { type: 'payment', id: paymentId }, at: now });
  const payload = { payment_id: paymentId, invoice_id: r.invoiceId, order_id: r.orderId, package_id: r.packageId, contact_id: r.contactId, amount: String(r.amount) };
  return { paymentId, events: [{ topic: 'payment.refund_requested', payload }] };
}

/** Phương thức hoàn mặc định = phương thức của khoản thu gần nhất (sàn thu hộ → sàn hoàn). */
export async function refundMethodOf(tx: TenantTx, where: { invoiceId?: string; orderId?: string }): Promise<Method> {
  const last = await tx.customerPayment.findFirst({ where: { ...where, kind: { not: 'refund' }, status: 'confirmed' }, orderBy: { createdAt: 'desc' }, select: { method: true } });
  const m = last?.method;
  return m && m !== 'points' ? m : 'bank_transfer';
}

export type RefundRow = NonNullable<Awaited<ReturnType<TenantTx['customerPayment']['findUnique']>>>;

/** Khoá + đọc yêu cầu hoàn đang chờ. */
export async function lockPendingRefund(tx: TenantTx, id: string): Promise<RefundRow> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM customer_payment WHERE id = ${id}::uuid FOR UPDATE`;
  const p = UUID.test(id) ? await tx.customerPayment.findUnique({ where: { id } }) : null;
  if (!p || p.kind !== 'refund') throw new AppError('NOT_FOUND', 404, { payment_id: 'not_found' });
  if (p.status !== 'pending') throw new AppError('INVALID_STATE', 409, { status: p.status });
  return p;
}

/** Duyệt: confirmed + cộng đã hoàn vào đơn (pay_status), liệu trình → refunded, nhật ký đơn. */
export async function approveRefund(tx: TenantTx, p: RefundRow, actor: Actor, note: string, now: Date): Promise<Ev[]> {
  const amount = -p.amount;
  await tx.customerPayment.update({ where: { id: p.id }, data: { status: 'confirmed', decidedBy: actor.id, decidedAt: now, decisionNote: note } });
  if (p.orderId) {
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${p.orderId}::uuid FOR UPDATE`;
    const o = await tx.order.findUniqueOrThrow({ where: { id: p.orderId } });
    const refundedTotal = o.refundedTotal + amount;
    if (refundedTotal > o.paidTotal) throw new AppError('INVALID_STATE', 409, { amount: 'over_paid' });
    const stillPending = await tx.customerPayment.count({ where: { orderId: o.id, kind: 'refund', status: 'pending', id: { not: p.id } } });
    await tx.order.update({ where: { id: o.id }, data: { refundedTotal, ...payCols({ ...o, refundedTotal }), refundPending: stillPending > 0, updatedAt: now } });
    await logEvent(tx, o.id, 'refunded', actor, now, { amount, reason: p.reason });
  }
  if (p.packageId) await tx.customerPackage.update({ where: { id: p.packageId }, data: { status: 'refunded', updatedAt: now } });
  await writeTimeline(tx, { contactId: p.contactId, type: 'payment', key: 'refund_approved', params: { amount: String(amount) }, actor, ref: { type: 'payment', id: p.id }, at: now });
  return [{ topic: 'payment.refunded', payload: { payment_id: p.id, invoice_id: p.invoiceId, order_id: p.orderId, package_id: p.packageId, contact_id: p.contactId, amount: String(amount) } }];
}

/** Từ chối: failed + ghi chú; đơn hết yêu cầu chờ → bỏ cờ chờ hoàn tiền. */
export async function rejectRefund(tx: TenantTx, p: RefundRow, actor: Actor, note: string, now: Date): Promise<Ev[]> {
  await tx.customerPayment.update({ where: { id: p.id }, data: { status: 'failed', decidedBy: actor.id, decidedAt: now, decisionNote: note } });
  if (p.orderId) {
    const stillPending = await tx.customerPayment.count({ where: { orderId: p.orderId, kind: 'refund', status: 'pending' } });
    if (!stillPending) await tx.order.update({ where: { id: p.orderId }, data: { refundPending: false, updatedAt: now } });
    await logEvent(tx, p.orderId, 'refund_rejected', actor, now, { amount: -p.amount, reason: note });
  }
  await writeTimeline(tx, { contactId: p.contactId, type: 'payment', key: 'refund_rejected', params: { amount: String(-p.amount) }, actor, ref: { type: 'payment', id: p.id }, at: now });
  return [{ topic: 'payment.refund_rejected', payload: { payment_id: p.id, invoice_id: p.invoiceId, order_id: p.orderId, package_id: p.packageId, contact_id: p.contactId, amount: String(-p.amount) } }];
}
