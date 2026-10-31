// quote.create · update · delete · comment (Blueprint §3.4 sales; COMMERCE §3, §8b). Ghi trong transaction của executor: tổng tính
// bằng quoteTotals, mã `BG-{n}` theo sequence (money-time-numbering §3), phụ trách lúc tạo ghi `owner_user_id` (doanh số — §8b).
// Sửa chỉ ở `draft` (bảng QUOTE_FLOW); sau khi gửi thì sửa = `quote.request_revision` (D46). Xoá = xoá mềm bản nháp chưa từng gửi.
import { Inject, Injectable } from '@nestjs/common';
import { TenantSql } from '@appchat/db';
import { AppError, QUOTE_FLOW, assertTransition, mergeCustomValues, quoteTotals, type CustomValues, type Discount } from '@appchat/shared';
import type { ActionInput, quoteComment, quoteCreate, quoteDelete, quoteUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { nextCode } from '../../../kernel/sequence';
import { CrmMembers, actorUserId } from '../../../crm/public';
import { lockQuote, visibleQuote } from '../quote-access';
import { checkParties, checkQuoteCustom, creatorOf, linesOf, resolveLines, totalCols, writeLines, type LineIn, type QuoteFieldsIn } from '../services/quote-write';

type CreateIn = ActionInput<typeof quoteCreate>;
type UpdateIn = ActionInput<typeof quoteUpdate>;

export interface NewQuote extends QuoteFieldsIn {
  contact_id: string;
  items: LineIn[];
}

/** Tạo bản nháp (dùng chung `quote.create` / `quote.draft_from_content`). `offCatalog` chỉ tính cho báo giá AI / agent tạo (§12). */
export async function insertQuote(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: NewQuote, now: Date, o: { ai?: boolean } = {}) {
  const { ownerUserId } = await checkParties(ctx, tx, members, { contactId: input.contact_id, ownerUserId: input.owner_user_id });
  await checkQuoteCustom(ctx, tx, members, input.custom, 'create');
  const { lines, offCatalog } = await resolveLines(tx, input.items);
  const creator = creatorOf(ctx, o.ai);
  const t = quoteTotals(lines, input.header_discount ?? null);
  const id = uuidv7(now.getTime());
  const code = await nextCode(tx, 'quote');
  const tpl = await tx.docTemplate.findFirst({ where: { kind: 'quote', isDefault: true, deletedAt: null }, select: { id: true, version: true } });
  await tx.quote.create({
    data: {
      id,
      code,
      rootQuoteId: id,
      contactId: input.contact_id,
      ownerUserId,
      templateId: tpl?.id ?? null,
      templateVersion: tpl?.version ?? null,
      headerDiscount: (input.header_discount ?? undefined) as object | undefined,
      ...totalCols(t),
      validDays: input.valid_days ?? 15,
      note: input.note?.trim() ?? '',
      gift: input.gift?.trim() ?? '',
      paymentTerms: input.payment_terms?.trim() ?? '',
      offCatalog: creator !== 'user' && offCatalog,
      createdByType: creator,
      createdById: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx),
      custom: (input.custom ?? {}) as object,
      createdAt: now,
      updatedAt: now,
    },
  });
  await writeLines(tx, id, lines, t, now);
  return { id, code, offCatalog: lines.filter((l) => !l.product_id).length };
}

@Injectable()
@ActionHandler('quote.create')
export class QuoteCreateHandler implements Handler<CreateIn, { quote_id: string; code: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<HandlerOutcome<{ quote_id: string; code: string }>> {
    const q = await insertQuote(ctx, tx, this.members, input, this.clock.now());
    return { result: { quote_id: q.id, code: q.code }, after: { id: q.id } };
  }

  /** Hoàn tác trong 24h, khi báo giá chưa gửi (Blueprint §3.4) — xoá hẳn bản nháp. */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const id = (log.after as { id: string }).id;
    const q = await tx.quote.findUnique({ where: { id }, select: { sentAt: true } });
    if (q?.sentAt) throw new AppError('INVALID_TRANSITION', 409, { status: 'sent' });
    await tx.quote.deleteMany({ where: { id } });
  }
}

@Injectable()
@ActionHandler('quote.update')
export class QuoteUpdateHandler implements Handler<UpdateIn, { quote_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<HandlerOutcome<{ quote_id: string }>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    assertTransition(QUOTE_FLOW, q.status, 'quote.update');
    const now = this.clock.now();
    const p = input.patch;
    if (p.contact_id && p.contact_id !== q.contactId) throw new AppError('VALIDATION_FAILED', 422, { 'patch.contact_id': 'immutable' });
    if (p.owner_user_id) await checkParties(ctx, tx, this.members, { contactId: q.contactId, ownerUserId: p.owner_user_id });
    await checkQuoteCustom(ctx, tx, this.members, p.custom, 'update');
    const header = p.header_discount !== undefined ? p.header_discount : (q.headerDiscount as Discount | null);
    const lines = p.items ? (await resolveLines(tx, p.items)).lines : null;
    const t = quoteTotals(lines ?? (await linesOf(tx, q.id)), header);
    if (lines) await writeLines(tx, q.id, lines, t, now);
    // Dòng đổi tay → còn dòng ngoài danh mục do AI soạn thì giữ cờ (người duyệt vẫn phải xem).
    const offCatalog = lines ? q.offCatalog && lines.some((l) => !l.product_id) : q.offCatalog;
    await tx.quote.update({
      where: { id: q.id },
      data: {
        ...totalCols(t),
        offCatalog,
        ...(p.header_discount !== undefined ? { headerDiscount: p.header_discount ? (p.header_discount as object) : TenantSql.DbNull } : {}),
        ...(p.owner_user_id ? { ownerUserId: p.owner_user_id } : {}),
        ...(p.valid_days !== undefined ? { validDays: p.valid_days } : {}),
        ...(p.note !== undefined ? { note: p.note.trim() } : {}),
        ...(p.gift !== undefined ? { gift: p.gift.trim() } : {}),
        ...(p.payment_terms !== undefined ? { paymentTerms: p.payment_terms.trim() } : {}),
        ...(p.custom !== undefined ? { custom: mergeCustomValues(q.custom as CustomValues, p.custom) as object } : {}),
        updatedAt: now,
      },
    });
    return { result: { quote_id: q.id }, after: { id: q.id } };
  }
}

@Injectable()
@ActionHandler('quote.delete')
export class QuoteDeleteHandler implements Handler<ActionInput<typeof quoteDelete>, { quote_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteDelete>, tx: TenantTx): Promise<HandlerOutcome<{ quote_id: string }>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    assertTransition(QUOTE_FLOW, q.status, 'quote.delete');
    if (q.sentAt) throw new AppError('INVALID_TRANSITION', 409, { status: 'sent' });
    const now = this.clock.now();
    await tx.quote.update({ where: { id: q.id }, data: { deletedAt: now, updatedAt: now } });
    // Xoá bản sửa (lần n > 1) → bản trước quay lại trạng thái đã gửi (khách vẫn giữ báo giá cũ).
    const prev = q.version > 1 ? await tx.quote.findFirst({ where: { rootQuoteId: q.rootQuoteId, version: q.version - 1, status: 'revision_requested', deletedAt: null } }) : null;
    if (prev) await tx.quote.update({ where: { id: prev.id }, data: { status: prev.viewedAt ? 'viewed' : 'sent', updatedAt: now } });
    return { result: { quote_id: q.id }, before: { id: q.id, prev: prev?.id ?? null } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteDelete>, tx: TenantTx) {
    const q = await visibleQuote(tx, ctx.authz, input.quote_id);
    return { summary: `${q.code} · L${q.version}`, risk: 'delete' as const };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; prev: string | null };
    if (b.prev) {
      const n = await tx.quote.updateMany({ where: { id: b.prev, status: { in: ['sent', 'viewed'] } }, data: { status: 'revision_requested' } });
      if (!n.count) throw new AppError('CONFLICT', 409, { quote_id: 'changed' });
    }
    await tx.quote.update({ where: { id: b.id }, data: { deletedAt: null } });
  }
}

@Injectable()
@ActionHandler('quote.comment')
export class QuoteCommentHandler implements Handler<ActionInput<typeof quoteComment>, { quote_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteComment>, tx: TenantTx): Promise<HandlerOutcome<{ quote_id: string }>> {
    const q = await visibleQuote(tx, ctx.authz, input.quote_id);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.quoteComment.create({ data: { id, quoteId: q.id, authorId: actorUserId(ctx), body: input.text, createdAt: now } });
    return { result: { quote_id: q.id }, after: { id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await tx.quoteComment.deleteMany({ where: { id: (log.after as { id: string }).id } });
  }
}
