// quote.request_revision (COMMERCE §3; D46): khách xin sửa → bản hiện tại `revision_requested`, sinh phiên bản n+1 `draft` cùng mã (sao
// chép dòng, chiết khấu, điều khoản — KHÔNG áp mức giảm khách xin); bản cũ thành `superseded` khi bản mới được gửi. Nguồn mang dòng dõi
// khách cần biên nhận ý định khách (TIP-022c), tiêu thụ cùng transaction; kết quả là id bản nháp mới thật.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, QUOTE_FLOW, assertTransition, quoteTotals, type Discount } from '@appchat/shared';
import type { ActionInput, quoteRequestRevision } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ExecuteMeta, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId } from '../../../crm/public';
import { lockQuote } from '../quote-access';
import { hasNewerVersion, linesOf, moveStatus, writeLines } from '../services/quote-write';
import { admitCustomerIntent } from '../services/customer-intent-guard';
import { revisionPreview } from '../previews/quote-decide.handlers.preview';
import { assertBoundDecision, bindDecision } from './shared';

type RevOut = { quote_id: string; code: string; version: number };

@Injectable()
@ActionHandler('quote.request_revision')
export class QuoteRevisionHandler implements Handler<ActionInput<typeof quoteRequestRevision>, RevOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteRequestRevision>, tx: TenantTx, _ptx?: unknown, _prepared?: unknown, meta?: ExecuteMeta): Promise<HandlerOutcome<RevOut>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const intent = await admitCustomerIntent(tx, ctx, 'quote.request_revision', q);
    assertBoundDecision(ctx, q);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.request_revision');
    if (await hasNewerVersion(tx, q)) throw new AppError('INVALID_TRANSITION', 409, { status: q.status, version: 'newer_exists' });
    const now = this.clock.now();
    await moveStatus(tx, q, to, {}, now);
    const lines = await linesOf(tx, q.id);
    const id = uuidv7(now.getTime());
    const version = q.version + 1;
    await tx.quote.create({
      data: {
        id,
        code: q.code,
        version,
        rootQuoteId: q.rootQuoteId,
        contactId: q.contactId,
        // Bản sửa giữ nhóm của bản trước (lineage — DC-299).
        teamId: q.teamId,
        ownerUserId: q.ownerUserId,
        // Bản sửa chép người tạo + người phụ trách vận hành HIỆN TẠI riêng biệt (TIP-015d).
        assignedUserId: q.assignedUserId,
        templateId: q.templateId,
        templateVersion: q.templateVersion,
        headerDiscount: (q.headerDiscount ?? undefined) as object | undefined,
        subtotal: q.subtotal,
        lineDiscountTotal: q.lineDiscountTotal,
        discountTotal: q.discountTotal,
        taxTotal: q.taxTotal,
        total: q.total,
        validDays: q.validDays,
        note: q.note,
        gift: q.gift,
        paymentTerms: q.paymentTerms,
        offCatalog: q.offCatalog,
        // TIP-026c: bản n+1 kế thừa cơ hội + cờ của bản trước.
        opportunityId: q.opportunityId,
        opportunitySyncValue: q.opportunitySyncValue,
        opportunityFollowUp: q.opportunityFollowUp,
        createdByType: ctx.actor.type === 'agent' ? 'agent' : ctx.source === 'assistant' ? 'assistant' : 'user',
        createdById: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx),
        custom: (q.custom ?? {}) as object,
        createdAt: now,
        updatedAt: now,
      },
    });
    await writeLines(tx, id, lines, quoteTotals(lines, q.headerDiscount as Discount | null), now);
    const reason = input.reason?.trim();
    if (reason) await tx.quoteComment.create({ data: { id: uuidv7(now.getTime()), quoteId: id, authorId: actorUserId(ctx), body: reason, createdAt: now } });
    if (intent) await intent.consume(meta!.actionLogId, now);
    return { result: { quote_id: id, code: q.code, version }, before: { id: q.id, status: q.status }, after: { id } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteRequestRevision>, tx: TenantTx) {
    return revisionPreview(ctx, tx, input);
  }

  async bindPreview(ctx: ActionContext, input: ActionInput<typeof quoteRequestRevision>, tx: TenantTx) {
    return bindDecision(ctx, tx, input.quote_id);
  }
}
