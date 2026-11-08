// quote.mark_accepted · mark_rejected · request_revision (COMMERCE §3, §8; D46). Khách phản hồi: chốt / từ chối → trạng thái cuối +
// event + timeline (+ lùi giai đoạn khách về Đang tư vấn nếu không còn báo giá mở); xin sửa → bản hiện tại `revision_requested`, sinh
// phiên bản n+1 `draft` cùng mã (sao chép dòng, chiết khấu, điều khoản); bản cũ thành `superseded` khi bản mới được gửi.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, OPEN_QUOTE_STATUSES, QUOTE_FLOW, assertTransition, quoteTotals, type Discount } from '@appchat/shared';
import type { ActionInput, quoteMarkAccepted, quoteMarkRejected, quoteRequestRevision } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId, applyStageRule, writeTimeline } from '../../../crm/public';
import { lockQuote, type QuoteRecord } from '../quote-access';
import { hasNewerVersion, linesOf, moveStatus, writeLines } from '../services/quote-write';
import { acceptPreview, rejectPreview, revisionPreview } from '../previews/quote-decide.handlers.preview';

type Out = { quote_id: string; status: string };
type Actor = { type: string; id: string | null };

/** Còn báo giá mở (khác `exceptId`) của khách → không lùi giai đoạn (COMMERCE §8). */
async function hasOpenQuote(tx: TenantTx, contactId: string, exceptId: string) {
  return !!(await tx.quote.findFirst({ where: { contactId, id: { not: exceptId }, deletedAt: null, status: { in: [...OPEN_QUOTE_STATUSES] } }, select: { id: true } }));
}

/** Báo giá kết thúc không thành (từ chối / hết hạn) → timeline + lùi giai đoạn khách nếu hết báo giá mở. Dùng chung job hết hạn. */
export async function closeLost(tx: TenantTx, q: Pick<QuoteRecord, 'id' | 'contactId' | 'code'>, key: 'quote_rejected' | 'quote_expired', actor: Actor, now: Date) {
  await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key, params: { code: q.code }, actor, ref: { type: 'quote', id: q.id }, at: now });
  return (await hasOpenQuote(tx, q.contactId, q.id)) ? [] : applyStageRule(tx, { contactId: q.contactId, mode: 'fallback', to: 'consulting', actor, now });
}

const payload = (q: QuoteRecord, reason?: string) => ({ quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version, ...(reason ? { reason } : {}) });
const actorOf = (ctx: ActionContext): Actor => ({ type: ctx.actor.type, id: actorUserId(ctx) });

async function undoDecision(tx: TenantTx, log: ActionLogRow, decided: 'accepted' | 'rejected') {
  const b = log.before as { id: string; status: 'sent' | 'viewed' };
  const q = await tx.quote.findUnique({ where: { id: b.id }, select: { orderId: true } });
  // Đã chuyển thành đơn / hợp đồng thì không hoàn tác được.
  if (q?.orderId) throw new AppError('CONFLICT', 409, { quote_id: 'converted' });
  const n = await tx.quote.updateMany({ where: { id: b.id, status: decided }, data: { status: b.status, decidedAt: null } });
  if (!n.count) throw new AppError('CONFLICT', 409, { quote_id: 'changed' });
}

@Injectable()
@ActionHandler('quote.mark_accepted')
export class QuoteAcceptHandler implements Handler<ActionInput<typeof quoteMarkAccepted>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteMarkAccepted>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.mark_accepted');
    const now = this.clock.now();
    await moveStatus(tx, q, to, { decidedAt: now }, now);
    await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_accepted', params: { code: q.code }, actor: actorOf(ctx), ref: { type: 'quote', id: q.id }, at: now });
    return { result: { quote_id: q.id, status: to }, before: { id: q.id, status: q.status }, events: [{ topic: 'quote.accepted', payload: payload(q) }] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoDecision(tx, log, 'accepted');
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteMarkAccepted>, tx: TenantTx) {
    return acceptPreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('quote.mark_rejected')
export class QuoteRejectHandler implements Handler<ActionInput<typeof quoteMarkRejected>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteMarkRejected>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.mark_rejected');
    const now = this.clock.now();
    await moveStatus(tx, q, to, { decidedAt: now }, now);
    const reason = input.reason?.trim();
    if (reason) await tx.quoteComment.create({ data: { id: uuidv7(now.getTime()), quoteId: q.id, authorId: actorUserId(ctx), body: reason, createdAt: now } });
    const stage = await closeLost(tx, q, 'quote_rejected', actorOf(ctx), now);
    return { result: { quote_id: q.id, status: to }, before: { id: q.id, status: q.status }, events: [{ topic: 'quote.rejected', payload: payload(q, reason) }, ...stage] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoDecision(tx, log, 'rejected');
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteMarkRejected>, tx: TenantTx) {
    return rejectPreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('quote.request_revision')
export class QuoteRevisionHandler implements Handler<ActionInput<typeof quoteRequestRevision>, { quote_id: string; code: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteRequestRevision>, tx: TenantTx): Promise<HandlerOutcome<{ quote_id: string; code: string; version: number }>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
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
    return { result: { quote_id: id, code: q.code, version }, before: { id: q.id, status: q.status }, after: { id } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteRequestRevision>, tx: TenantTx) {
    return revisionPreview(ctx, tx, input);
  }
}
