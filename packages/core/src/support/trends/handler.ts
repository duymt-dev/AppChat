// Action đọc `ticket.stock_summary` (TIP-034d §4.3) — cùng dịch vụ với thẻ KPI màn Ticket. Không chụp quan sát, không gọi model, không
// trừ Credit. Kết quả có tập đóng góp đóng băng (`result_id`) để lịch sử / GenUI $ref chỉ chiếu lại khi nguồn còn đọc được.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionOutput, ticketStockSummary } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { SlaCalendar } from '../services/sla-clock';
import { materializeStockResult } from './projection';

type Out = ActionOutput<typeof ticketStockSummary>;

@Injectable()
@ActionHandler('ticket.stock_summary')
export class TicketStockSummaryHandler implements Handler<ActionInput<typeof ticketStockSummary>, Out> {
  constructor(
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, _i: unknown, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { timeZone } = await this.cal.of(ctx.workspaceId);
    return { result: await materializeStockResult(tx, ctx.authz, timeZone, this.clock.now()) };
  }
}
