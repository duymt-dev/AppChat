// quote.mark_rejected (COMMERCE §3, §8): khách từ chối → `rejected` + lý do (bình luận) + lùi giai đoạn khách nếu họ khách hết báo giá mở.
// Họ khách khoá TRƯỚC báo giá (TIP-015g). Nguồn mang dòng dõi khách cần biên nhận ý định khách (TIP-022c), tiêu thụ cùng transaction.
import { Inject, Injectable } from '@nestjs/common';
import { QUOTE_FLOW, assertTransition } from '@appchat/shared';
import type { ActionInput, quoteMarkRejected } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type ExecuteMeta, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId, lockStageFamilyOf } from '../../../crm/public';
import { lockQuote } from '../quote-access';
import { moveStatus } from '../services/quote-write';
import { admitCustomerIntent } from '../services/customer-intent-guard';
import { rejectPreview } from '../previews/quote-decide.handlers.preview';
import { actorOf, assertBoundDecision, bindDecision, closeLost, type Out, payload, undoDecision } from './shared';

@Injectable()
@ActionHandler('quote.mark_rejected')
export class QuoteRejectHandler implements Handler<ActionInput<typeof quoteMarkRejected>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteMarkRejected>, tx: TenantTx, _ptx?: unknown, _prepared?: unknown, meta?: ExecuteMeta): Promise<HandlerOutcome<Out>> {
    await lockStageFamilyOf(tx, 'quote', input.quote_id);
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const intent = await admitCustomerIntent(tx, ctx, 'quote.mark_rejected', q);
    assertBoundDecision(ctx, q);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.mark_rejected');
    const now = this.clock.now();
    await moveStatus(tx, q, to, { decidedAt: now }, now);
    const reason = input.reason?.trim();
    if (reason) await tx.quoteComment.create({ data: { id: uuidv7(now.getTime()), quoteId: q.id, authorId: actorUserId(ctx), body: reason, createdAt: now } });
    const stage = await closeLost(tx, q, 'quote_rejected', actorOf(ctx), now);
    if (intent) await intent.consume(meta!.actionLogId, now);
    return { result: { quote_id: q.id, status: to }, before: { id: q.id, status: q.status }, events: [{ topic: 'quote.rejected', payload: payload(q, reason) }, ...stage] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoDecision(tx, log, 'rejected');
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteMarkRejected>, tx: TenantTx) {
    return rejectPreview(ctx, tx, input);
  }

  async bindPreview(ctx: ActionContext, input: ActionInput<typeof quoteMarkRejected>, tx: TenantTx) {
    return bindDecision(ctx, tx, input.quote_id);
  }
}
