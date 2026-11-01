// Luật event ticket (Blueprint §2.3 consumer `notify`, REQ-H03 leo thang): sắp đến hạn → `sla_warn` cho người phụ trách (không ai → người
// quản lý SLA); quá hạn → `sla_breach` cho người quản lý SLA (Chủ sở hữu + Quản lý — "nhắc Owner") và người phụ trách; giao ticket cho
// người khác → `ticket_assigned`. WS `ticket.updated` cho trang Ticket (lọc quyền + scope support). Nạp khi import SupportModule.
import { ticketEvent } from '@appchat/shared';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

const link = (id: string) => `/tickets?open=${id}`;

registerNotificationRule('support.sla_warn', 'ticket.sla_warning', (e) => {
  const p = ticketEvent.parse(e.payload);
  return [{ kind: 'sla_warn', to: p.assignee_user_id ? { userIds: [p.assignee_user_id] } : { permission: 'sla.manage' }, params: { count: 1, code: p.code, title: p.title }, link: link(p.ticket_id) }];
});

registerNotificationRule('support.sla_breach', 'ticket.sla_breached', (e) => {
  const p = ticketEvent.parse(e.payload);
  const params = { code: p.code, title: p.title };
  return [
    { kind: 'sla_breach', to: { permission: 'sla.manage' }, params, link: link(p.ticket_id) },
    ...(p.assignee_user_id ? [{ kind: 'sla_breach' as const, to: { userIds: [p.assignee_user_id] }, params, link: link(p.ticket_id) }] : []),
  ];
});

registerNotificationRule('support.assigned', 'ticket.assigned', (e) => {
  const p = ticketEvent.parse(e.payload);
  if (!p.assignee_user_id || p.assignee_user_id === p.by_user_id) return [];
  return [{ kind: 'ticket_assigned', to: { userIds: [p.assignee_user_id] }, params: { code: p.code, title: p.title }, link: link(p.ticket_id) }];
});

for (const topic of ['ticket.created', 'ticket.assigned', 'ticket.updated', 'ticket.closed', 'ticket.reopened', 'ticket.sla_warning', 'ticket.sla_breached'])
  registerRealtimeRule(`support.${topic}`, topic, (e) => {
    const p = ticketEvent.parse(e.payload);
    const scope = { module: 'support' as const, row: { assigneeUserId: p.assignee_user_id }, fields: { owner: 'assigneeUserId' } };
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'ticket.updated', data: { ticket_id: p.ticket_id, change: topic }, require: { permission: 'ticket.view', scope } }];
  });
