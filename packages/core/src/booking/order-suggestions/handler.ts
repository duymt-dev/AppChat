// appointment.order_suggestions (TIP-033c §1.2): thẻ gợi ý tạo đơn hiện hành — đọc qua bộ đọc chung (read.ts), không ghi, không gọi model.
import { Injectable } from '@nestjs/common';
import type { ActionInput, appointmentOrderSuggestions } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { readSuggestions, type SuggestionPage } from './read';

@Injectable()
@ActionHandler('appointment.order_suggestions')
export class AppointmentOrderSuggestionsHandler implements Handler<ActionInput<typeof appointmentOrderSuggestions>, SuggestionPage> {
  async execute(ctx: ActionContext, i: ActionInput<typeof appointmentOrderSuggestions>, tx: TenantTx): Promise<HandlerOutcome<SuggestionPage>> {
    const q = i.appointment_id ? { appointment_id: i.appointment_id } : { conversation_id: i.conversation_id!, ...(i.limit ? { limit: i.limit } : {}), ...(i.cursor ? { cursor: i.cursor } : {}) };
    return { result: await readSuggestions(tx, ctx.authz, q), noUndo: true };
  }
}
