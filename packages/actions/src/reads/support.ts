// Action đọc ticket cho Trợ lý / agent (TIP-023b R2 · DC-224): cùng `visibleTicket` với màn Hỗ trợ (ngoài scope → NOT_FOUND).
import { z } from 'zod';
import { defineAction } from '../define';

export const ticketGet = defineAction({
  id: 'ticket.get',
  module: 'support',
  title: 'actions.ticket.get.title',
  description: 'Get one support ticket: title, description, status, priority, SLA due times and assignee. Accepts id or code. Example: {"ticket_id":"TKT-0012"}',
  input: z.object({ ticket_id: z.string().min(1) }),
  output: z.object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    channel: z.string(),
    contact_id: z.string().nullable(),
    status: z.string(),
    priority: z.string(),
    assignee_user_id: z.string().nullable(),
    assignee_agent_id: z.string().nullable(),
    frt_due_at: z.string(),
    ttr_due_at: z.string(),
    sla_result: z.string().nullable(),
  }),
  permission: 'ticket.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'ticket', id: o.id, view: 'drawer' }),
});
