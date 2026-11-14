// quote.mark_accepted (COMMERCE §3; D46): khách chốt → `accepted` + timeline + event. Nguồn mang dòng dõi khách (agent / tác vụ) phải có
// biên nhận ý định khách ≥ 70% đã lưu TRƯỚC hiệu ứng (TIP-022c customer-intent-guard), tiêu thụ cùng transaction.
import { Inject, Injectable } from '@nestjs/common';
import { QUOTE_FLOW, assertTransition } from '@appchat/shared';
import type { ActionInput, quoteMarkAccepted } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type ExecuteMeta, type HandlerOutcome } from '../../../kernel/actions/handler';
import { writeTimeline } from '../../../crm/public';
import { lockQuote } from '../quote-access';
import { moveStatus } from '../services/quote-write';
import { admitCustomerIntent } from '../services/customer-intent-guard';
import { acceptPreview } from '../previews/quote-decide.handlers.preview';
import { actorOf, assertBoundDecision, bindDecision, type Out, payload, undoDecision } from './shared';

@Injectable()
@ActionHandler('quote.mark_accepted')
export class QuoteAcceptHandler implements Handler<ActionInput<typeof quoteMarkAccepted>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteMarkAccepted>, tx: TenantTx, _ptx?: unknown, _prepared?: unknown, meta?: ExecuteMeta): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const intent = await admitCustomerIntent(tx, ctx, 'quote.mark_accepted', q);
    assertBoundDecision(ctx, q);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.mark_accepted');
    const now = this.clock.now();
    await moveStatus(tx, q, to, { decidedAt: now }, now);
    await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_accepted', params: { code: q.code }, actor: actorOf(ctx), ref: { type: 'quote', id: q.id }, at: now });
    if (intent) await intent.consume(meta!.actionLogId, now);
    return { result: { quote_id: q.id, status: to }, before: { id: q.id, status: q.status }, events: [{ topic: 'quote.accepted', payload: payload(q) }] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoDecision(tx, log, 'accepted');
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteMarkAccepted>, tx: TenantTx) {
    return acceptPreview(ctx, tx, input);
  }

  async bindPreview(ctx: ActionContext, input: ActionInput<typeof quoteMarkAccepted>, tx: TenantTx) {
    return bindDecision(ctx, tx, input.quote_id);
  }
}
