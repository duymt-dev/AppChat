// Nối đơn hàng ↔ khoản thu (COMMERCE §4, §4b): huỷ đơn đã thu → một yêu cầu hoàn toàn bộ số còn hoàn được (chờ duyệt — người có
// `payment.refund_approve` được báo), đơn sàn → phương thức `marketplace` (sàn hoàn cho người mua); đơn sàn được sàn báo đã thanh toán →
// khoản thu `marketplace` (không đề nghị / VietQR / phiếu thu của DN). Gọi trong transaction của huỷ / nhập đơn.
import { createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import type { Actor } from '../../orders/services/order-write';
import { orderRefundable, refundMethodOf, requestRefund } from './refunds';

type Ev = { topic: string; payload: Record<string, unknown> };
type OrderLike = { id: string; code: string; contactId: string; source: string };

export async function refundCancelled(tx: TenantTx, o: OrderLike, reason: string, actor: Actor, now: Date): Promise<Ev[]> {
  const amount = await orderRefundable(tx, o.id);
  if (amount <= 0n) return [];
  const m = serverMessages('vi').sales.invoice.refund;
  const method = o.source === 'marketplace' ? 'marketplace' : await refundMethodOf(tx, { orderId: o.id });
  const r = await requestRefund(tx, { contactId: o.contactId, orderId: o.id, invoiceId: null, packageId: null, amount, method, reason: `${interpolate(m.order, { code: o.code })}: ${reason}`.slice(0, 500), actor }, now);
  const notify: Ev = {
    topic: 'notify.requested',
    payload: { kind: 'refund_approval', to: { permission: 'payment.refund_approve' }, params: { actor: '', contact: o.code, amount: createFmt({ locale: 'vi' }).money(String(amount)) }, link: '/invoices' },
  };
  return [...r.events, notify];
}

/** Đơn sàn đã thanh toán: ghi khoản thu `marketplace` một lần cho phần chênh (sàn là nguồn sự thật). */
export async function recordMarketplacePaid(tx: TenantTx, o: { id: string; contactId: string; externalId: string | null }, amount: bigint, now: Date) {
  if (amount <= 0n) return;
  await tx.customerPayment.create({
    data: {
      id: uuidv7(now.getTime()),
      orderId: o.id,
      contactId: o.contactId,
      kind: 'payment',
      amount,
      method: 'marketplace',
      reference: o.externalId ?? '',
      status: 'confirmed',
      paidAt: now,
      createdByType: 'system',
      createdAt: now,
    },
  });
}
