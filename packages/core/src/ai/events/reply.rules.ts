// Luật event agent trực kênh (TIP-022): `ai.handoff` → thông báo `ai_escalate` cho người phụ trách hội thoại (hoặc khách); chưa ai
// → người quản lý hộp thư (`inbox.assign`) + WS cập nhật hội thoại (banner "AI đã chuyển cho bạn"). Nạp cùng luật domain.
import { aiHandoffEvent } from '@appchat/shared';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';
import { convRecord } from '../../notify/realtime/records';

registerNotificationRule('ai.handoff', 'ai.handoff', (e) => {
  const p = aiHandoffEvent.parse(e.payload);
  const to = p.assignee_user_id ?? p.contact_owner_user_id;
  return [{ kind: 'ai_escalate', to: to ? { userIds: [to] } : { permission: 'inbox.assign' }, params: { agent: p.agent, contact: p.title }, link: `/inbox?c=${p.conversation_id}` }];
});

registerRealtimeRule('ai.handoff', 'ai.handoff', (e) => {
  const p = aiHandoffEvent.parse(e.payload);
  return [
    { ws: e.workspaceId, rooms: [rooms.conv(p.conversation_id)], event: 'conversation.updated', data: { conversation_id: p.conversation_id, change: 'ai_handoff' }, require: { permission: 'inbox.view' } },
    { ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'conversation.updated', data: { conversation_id: p.conversation_id, change: 'ai_handoff' }, require: { permission: 'inbox.view', record: convRecord(p) } },
  ];
});
