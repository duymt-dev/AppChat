// Luật event AI Agents + hàng chờ duyệt (Blueprint §2.3): `approval.requested` → thông báo `ai_review` cho người có
// `approvals.decide` (D07 — hiện ở chuông / Tổng quan) + WS `approval.changed`; `approval.decided` → WS làm mới hàng chờ / khung
// điều phối, hết hạn → báo Owner hiện tại một lần; `agent.*` → WS `agent.changed` (danh sách agent, routing kênh — TIP-022).
import { agentChangedEvent, approvalDecidedEvent, approvalRequestedEvent } from '@appchat/shared';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';
import { EXPIRY_ONCE } from '../approvals/expiry-delivery';

registerNotificationRule('ai.approval_requested', 'approval.requested', (e) => {
  const p = approvalRequestedEvent.parse(e.payload);
  return [{ kind: 'ai_review', to: { permission: 'approvals.decide' }, params: { agent: p.agent, title: p.title }, link: '/assistant/approvals' }];
});

// Hết hạn duyệt (TIP-019b §4.5): báo Owner HIỆN TẠI một lần (biên nhận `ai_expiry_delivery`), link tới hàng chờ — không kèm input / preview.
registerNotificationRule('ai.approval_expired', 'approval.decided', (e) => {
  const p = approvalDecidedEvent.parse(e.payload);
  if (p.status !== 'expired') return [];
  return [{ kind: 'ai_review', to: { ownerOnly: true }, params: { variant: 'expired' }, link: `/assistant/approvals?id=${p.approval_id}`, onceKey: `${EXPIRY_ONCE}:${p.approval_id}` }];
});

registerRealtimeRule('ai.approval_requested', 'approval.requested', (e) => {
  const p = approvalRequestedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'approval.changed', data: { approval_id: p.approval_id, status: 'pending' }, require: { permission: 'approvals.decide' } }];
});

registerRealtimeRule('ai.approval_decided', 'approval.decided', (e) => {
  const p = approvalDecidedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'approval.changed', data: { approval_id: p.approval_id, status: p.status, run_id: p.run_id }, require: { permission: 'approvals.decide' } }];
});

for (const topic of ['agent.published', 'agent.paused', 'agent.deleted'] as const) {
  registerRealtimeRule(`ai.${topic}`, topic, (e) => {
    const p = agentChangedEvent.parse(e.payload);
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'agent.changed', data: { agent_id: p.agent_id, version: p.version, status: p.status }, require: { permission: 'agents.manage' } }];
  });
}
