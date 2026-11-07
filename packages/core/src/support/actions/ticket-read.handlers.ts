// ticket.get (TIP-023b R2 · DC-224): Trợ lý / agent đọc một ticket. Cùng `visibleTicket` với màn Hỗ trợ (ngoài scope → NOT_FOUND).
import { Injectable } from '@nestjs/common';
import type { ActionInput, ticketGet } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleTicket } from '../ticket-access';

@Injectable()
@ActionHandler('ticket.get')
export class TicketGetHandler implements Handler<ActionInput<typeof ticketGet>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof ticketGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const t = await visibleTicket(tx, ctx.authz, i.ticket_id);
    return {
      result: {
        id: t.id,
        code: t.code,
        title: t.title,
        description: t.description,
        category: t.category,
        channel: t.channel,
        contact_id: t.contactId,
        status: t.status,
        priority: t.priority,
        assignee_user_id: t.assigneeUserId,
        assignee_agent_id: t.assigneeAgentId,
        frt_due_at: t.frtDueAt.toISOString(),
        ttr_due_at: t.ttrDueAt.toISOString(),
        sla_result: t.slaResult,
      },
    };
  }
}
