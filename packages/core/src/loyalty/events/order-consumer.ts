// Consumer `loyalty.orders` (TIP-036, COMMERCE §7): `order.completed` → `loyalty.earn` (lượt hoàn tất + căn cứ snapshot trong event);
// `order.cancelled` → `loyalty.reverse` cause cancel (đảo điểm tích + trả điểm đã dùng). Hoàn tiền: payment-consumer.ts. Gọi qua
// ActionExecutor nguồn system (log + outbox cùng transaction với sổ); `event_consumption` chặn chạy lại cùng event, khoá sổ
// (`dedupe_key`) chặn trùng nghĩa (event đến lặp / không thứ tự). Đơn huỷ trước khi earn chạy → earn thấy đơn không còn completed → bỏ qua.
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { EventConsumer } from '../../kernel/events/consumer';
import { LOYALTY_ACTOR } from '../actions/ledger-system.handlers';
import { domainTrigger, runSystemAction } from '../../kernel/actions/system';

export const LOYALTY_ORDERS_CONSUMER = 'loyalty.orders';

/** Ngữ cảnh system của loyalty; `key` = Idempotency-Key tất định (event / bucket) — job chạy lại trả đúng kết quả cũ, không ghi lần hai. */
export const loyaltySystemCtx = (ws: string, key?: string): ActionContext => ({ workspaceId: ws, source: 'system', actor: { type: 'system', id: LOYALTY_ACTOR }, authz: { isOwner: true } as never, ...(key ? { idempotencyKey: `loyalty:${key}` } : {}) });

/** TIP-003c: gọi action riêng tiền nhiệm 036 qua capability gắn nguồn (sự kiện / lịch); khoá sổ `dedupe_key` của domain vẫn là chống lặp. */
export const loyaltyTrigger = (ws: string, kind: 'event' | 'schedule', key: string, actionId: string, targetId: string, input: Record<string, unknown>) =>
  domainTrigger({ workspaceId: ws, actionId, actor: LOYALTY_ACTOR, sourceKind: kind, sourceRef: key, targetId, input, idempotencyKey: `loyalty:${key}` });

export function runLoyalty<O = unknown>(executor: Pick<ActionExecutor, 'execute'>, ws: string, kind: 'event' | 'schedule', key: string, actionId: string, targetId: string, input: Record<string, unknown>) {
  return runSystemAction<O>(executor, null, loyaltyTrigger(ws, kind, key, actionId, targetId, input), loyaltySystemCtx(ws, key));
}

/** Trigger v2 (event đã nạp lại) — cùng khoá với consumer v1 nên hai đường hội tụ một ghi sổ. */
export function loyaltyOrderTrigger(e: { id: string; topic: string; workspaceId: string; payload: Record<string, unknown> }) {
  const p = e.payload as { order_id?: string | null; completion_id?: string; basis?: Record<string, unknown> };
  if (!p.order_id) return null;
  const key = `${e.id}:${LOYALTY_ORDERS_CONSUMER}`;
  if (e.topic === 'order.completed') return p.completion_id ? loyaltyTrigger(e.workspaceId, 'event', key, 'loyalty.earn', p.order_id, { order_id: p.order_id, completion_id: p.completion_id, basis: p.basis ?? {} }) : null;
  return loyaltyTrigger(e.workspaceId, 'event', key, 'loyalty.reverse', p.order_id, { order_id: p.order_id, cause: 'cancel' });
}

export const loyaltyOrdersConsumer = (executor: Pick<ActionExecutor, 'execute'>): EventConsumer => ({
  name: LOYALTY_ORDERS_CONSUMER,
  topics: ['order.completed', 'order.cancelled'],
  async handle(e) {
    const p = e.payload as { order_id?: string | null; completion_id?: string; basis?: Record<string, unknown> };
    if (!p.order_id) return;
    const key = `${e.id}:${LOYALTY_ORDERS_CONSUMER}`;
    if (e.topic === 'order.completed') {
      // Event trước TIP-036 (không có lượt hoàn tất) → bỏ qua; điểm đơn cũ ghi bù bằng điều chỉnh tay (lý do missing_earn).
      if (p.completion_id) await runLoyalty(executor, e.workspaceId, 'event', key, 'loyalty.earn', p.order_id, { order_id: p.order_id, completion_id: p.completion_id, basis: p.basis ?? {} });
      return;
    }
    await runLoyalty(executor, e.workspaceId, 'event', key, 'loyalty.reverse', p.order_id, { order_id: p.order_id, cause: 'cancel' });
  },
});
