// Consumer `loyalty.orders` (TIP-036, COMMERCE §7): `order.completed` → `loyalty.earn` (lượt hoàn tất + căn cứ snapshot trong event);
// `order.cancelled` → `loyalty.reverse` cause cancel (đảo điểm tích + trả điểm đã dùng). Hoàn tiền: payment-consumer.ts. Gọi qua
// ActionExecutor nguồn system (log + outbox cùng transaction với sổ); `event_consumption` chặn chạy lại cùng event, khoá sổ
// (`dedupe_key`) chặn trùng nghĩa (event đến lặp / không thứ tự). Đơn huỷ trước khi earn chạy → earn thấy đơn không còn completed → bỏ qua.
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { EventConsumer } from '../../kernel/events/consumer';
import { LOYALTY_ACTOR } from '../actions/ledger-system.handlers';

export const LOYALTY_ORDERS_CONSUMER = 'loyalty.orders';

/** Ngữ cảnh system của loyalty; `key` = Idempotency-Key tất định (event / bucket) — job chạy lại trả đúng kết quả cũ, không ghi lần hai. */
export const loyaltySystemCtx = (ws: string, key?: string): ActionContext => ({ workspaceId: ws, source: 'system', actor: { type: 'system', id: LOYALTY_ACTOR }, authz: { isOwner: true } as never, ...(key ? { idempotencyKey: `loyalty:${key}` } : {}) });

export const loyaltyOrdersConsumer = (executor: Pick<ActionExecutor, 'execute'>): EventConsumer => ({
  name: LOYALTY_ORDERS_CONSUMER,
  topics: ['order.completed', 'order.cancelled'],
  async handle(e) {
    const p = e.payload as { order_id?: string | null; completion_id?: string; basis?: Record<string, unknown> };
    if (!p.order_id) return;
    const ctx = loyaltySystemCtx(e.workspaceId, `${e.id}:${LOYALTY_ORDERS_CONSUMER}`);
    if (e.topic === 'order.completed') {
      // Event trước TIP-036 (không có lượt hoàn tất) → bỏ qua; điểm đơn cũ ghi bù bằng điều chỉnh tay (lý do missing_earn).
      if (p.completion_id) await executor.execute(ctx, 'loyalty.earn', { order_id: p.order_id, completion_id: p.completion_id, basis: p.basis ?? {} });
      return;
    }
    await executor.execute(ctx, 'loyalty.reverse', { order_id: p.order_id, cause: 'cancel' });
  },
});
