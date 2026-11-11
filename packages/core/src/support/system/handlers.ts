// Handler action riêng `ticket.system_transition` (TIP-003c §2): chỉ tới đây sau cổng capability + biên nhận trigger của Executor. Tin
// nguồn (customer_message / first_response) là sourceRef của capability đã niêm phong — không nhận id tin từ input.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, ticketSystemTransition } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { systemCapabilityOf } from '../../kernel/actions/system';
import { CLOCK, type Clock } from '../../kernel/clock';
import { SlaCalendar } from '../services/sla-clock';
import { customerMessage, firstResponse, frtBreach, slaWarning, ttrBreach } from './effects';

@Injectable()
@ActionHandler('ticket.system_transition')
export class TicketSystemTransitionHandler implements Handler<ActionInput<typeof ticketSystemTransition>, SystemOutput> {
  constructor(
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof ticketSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const now = this.clock.now();
    const id = i.entity_id;
    const e =
      i.operation === 'customer_message' ? await customerMessage(tx, id, cap.sourceRef, now, await this.cal.of(ctx.workspaceId))
      : i.operation === 'first_response' ? await firstResponse(tx, id, cap.sourceRef)
      : i.operation === 'sla_warning' ? await slaWarning(tx, id, now)
      : i.operation === 'frt_breach' ? await frtBreach(tx, id, now)
      : await ttrBreach(tx, id, now);
    return { result: e.out, events: e.events, noUndo: true };
  }
}
