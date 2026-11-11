// Consumer `crm.lead-routing` (TIP-042b, DC-238): `lead.routing_requested` (pipeline phát khi khách vừa được tạo từ tin vào trực tiếp
// 1-1 live) → `lead_routing.apply` qua ActionExecutor nguồn system (actor `system:lead-routing`; log + outbox cùng transaction với
// quyết định). Idempotency-Key tất định theo event; `event_consumption` + unique quyết định chặn chạy hai lần / hai worker cùng lúc.
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { EventConsumer } from '../../kernel/events/consumer';
import { LEAD_ROUTING_ACTOR, LEAD_ROUTING_TOPIC } from './routing-apply.handler';
import { domainTrigger, runSystemAction } from '../../kernel/actions/system';

export const LEAD_ROUTING_CONSUMER = 'crm.lead-routing';

export const leadRoutingCtx = (ws: string, eventId: string): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: LEAD_ROUTING_ACTOR },
  authz: { isOwner: true } as never,
  idempotencyKey: `${eventId}:lead-routing`,
});

/** TIP-003c: action riêng tiền nhiệm 042b — nguồn là event đã lưu; unique quyết định của domain là chống lặp (biên nhận domain). */
export const leadRoutingTrigger = (e: { id: string; workspaceId: string }) =>
  domainTrigger({ workspaceId: e.workspaceId, actionId: 'lead_routing.apply', actor: LEAD_ROUTING_ACTOR, sourceKind: 'event', sourceRef: e.id, targetId: e.id, input: { event_id: e.id }, idempotencyKey: `${e.id}:lead-routing` });

export const leadRoutingConsumer = (executor: Pick<ActionExecutor, 'execute'>): EventConsumer => ({
  name: LEAD_ROUTING_CONSUMER,
  topics: [LEAD_ROUTING_TOPIC],
  async handle(e) {
    await runSystemAction(executor, null, leadRoutingTrigger(e), leadRoutingCtx(e.workspaceId, e.id));
  },
});
