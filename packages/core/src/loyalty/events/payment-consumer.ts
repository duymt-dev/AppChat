// Consumer `loyalty.payments` (TIP-036, COMMERCE §7 "hoàn tiền một phần: đảo theo tỉ lệ"): chỉ hoàn tiền đã duyệt (`payment.refunded` —
// sau `payment.refund_approve`; yêu cầu chờ / bị từ chối không đảo) có đơn → `loyalty.reverse` cause refund. Điểm đảo = tỉ lệ luỹ kế đã
// hoàn trên thực thu lúc hoàn tất trừ phần đã đảo (khoá sổ theo tổng đã hoàn) — hai lần hoàn một phần không đảo quá điểm gốc, chạy lại
// không đảo thêm. Đơn đã huỷ: điểm đã đảo hết ở `order.cancelled` → không còn gì để đảo.
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { EventConsumer } from '../../kernel/events/consumer';
import { loyaltyTrigger, runLoyalty } from './order-consumer';

export const LOYALTY_PAYMENTS_CONSUMER = 'loyalty.payments';

export const loyaltyPaymentsConsumer = (executor: Pick<ActionExecutor, 'execute'>): EventConsumer => ({
  name: LOYALTY_PAYMENTS_CONSUMER,
  topics: ['payment.refunded'],
  async handle(e) {
    const p = e.payload as { order_id?: string | null; payment_id?: string };
    if (!p.order_id) return;
    await runLoyalty(executor, e.workspaceId, 'event', `${e.id}:${LOYALTY_PAYMENTS_CONSUMER}`, 'loyalty.reverse', p.order_id, { order_id: p.order_id, cause: 'refund', ...(p.payment_id ? { payment_id: p.payment_id } : {}) });
  },
});

/** Trigger v2 của `payment.refunded` — cùng khoá với consumer v1. */
export function loyaltyRefundTrigger(e: { id: string; workspaceId: string; payload: Record<string, unknown> }) {
  const p = e.payload as { order_id?: string | null; payment_id?: string };
  if (!p.order_id) return null;
  return loyaltyTrigger(e.workspaceId, 'event', `${e.id}:${LOYALTY_PAYMENTS_CONSUMER}`, 'loyalty.reverse', p.order_id, { order_id: p.order_id, cause: 'refund', ...(p.payment_id ? { payment_id: p.payment_id } : {}) });
}
