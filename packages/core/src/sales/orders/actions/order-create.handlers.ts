// order.create · create_from_quote · create_from_contract (Blueprint §3.4 sales; COMMERCE §4, §8b). Mã `DH-{n}` (D52) theo sequence,
// tổng theo quoteTotals, người phụ trách lúc tạo ghi `owner_user_id` (doanh số). Từ báo giá: chỉ báo giá đã chốt, mỗi báo giá một đơn
// (gọi lại trả đơn cũ), đánh dấu `quote.order_id`. Từ hợp đồng: hợp đồng đã ký, dòng hàng lấy từ báo giá nguồn (nếu có) hoặc một dòng
// "tên hợp đồng × giá trị"; một hợp đồng sinh được nhiều đơn. Hoàn tác trong 24h khi đơn còn nguyên trạng — huỷ giữ lịch sử (TIP-032c).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, type CustomValues, type Discount } from '@appchat/shared';
import type { ActionInput, orderCreate, orderCreateFromContract, orderCreateFromQuote } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { nextCode } from '../../../kernel/sequence';
import { CrmMembers, writeTimeline } from '../../../crm/public';
import { linkConversation } from '../../../inbox/public';
import { checkParties, creatorOf, linesOf, resolveLines, type LineIn } from '../../quotes/services/quote-write';
import { lockConversion } from '../../quotes/services/conversion-lock';
import { UUID } from '../order-access';
import { createPreview, fromContractPreview, fromQuotePreview } from '../previews/order-create.handlers.preview';
import { EMPTY_SHIPPING, actorOf, checkOrderCustom, logEvent, orderPayload, payCols, totalCols, totalsOf, writeItems, type Actor } from '../services/order-write';
import { snapshotTeam } from '../../../authz/data-access';
import { createdReceipt, undoOrderCreate } from '../editing/order-create-undo';
import { orderVersion } from '../editing/order-version';
import { lockRootOf } from '../../../kernel/ownership/root-lock';

type Out = { order_id: string; code: string };

export interface NewOrder {
  contact_id: string;
  owner_user_id?: string;
  items: LineIn[];
  header_discount?: Discount | null;
  deposit_amount?: string;
  shipping?: Partial<typeof EMPTY_SHIPPING>;
  note?: string;
  custom?: CustomValues;
  source?: 'manual' | 'quote' | 'contract' | 'appointment';
  quote_id?: string;
  contract_id?: string;
  appointment_id?: string;
  conversation_id?: string | null;
  channel?: string;
}

/** Nhóm của bản ghi nguồn của đơn (báo giá → hợp đồng → lịch hẹn) — lineage rõ (DC-299). */
async function orderSourceTeam(tx: TenantTx, i: { quote_id?: string | null; contract_id?: string | null; appointment_id?: string | null }): Promise<string | null> {
  const q = i.quote_id ? await tx.quote.findUnique({ where: { id: i.quote_id }, select: { teamId: true } }) : null;
  if (q?.teamId) return q.teamId;
  const c = i.contract_id ? await tx.contract.findUnique({ where: { id: i.contract_id }, select: { teamId: true } }) : null;
  if (c?.teamId) return c.teamId;
  const a = i.appointment_id ? await tx.appointment.findUnique({ where: { id: i.appointment_id }, select: { teamId: true } }) : null;
  return a?.teamId ?? null;
}

/** Tạo đơn `new` (dùng chung 3 nguồn). Trả bản ghi + event `order.created`. */
export async function insertOrder(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: NewOrder, now: Date) {
  const { ownerUserId } = await checkParties(ctx, tx, members, { contactId: input.contact_id, ownerUserId: input.owner_user_id });
  await checkOrderCustom(ctx, tx, members, input.custom, 'create');
  const { lines } = await resolveLines(tx, input.items);
  const t = totalsOf(lines, input.header_discount);
  const deposit = BigInt(input.deposit_amount ?? '0');
  if (deposit > BigInt(t.total)) throw new AppError('VALIDATION_FAILED', 422, { deposit_amount: 'over_total' });
  const id = uuidv7(now.getTime());
  const code = await nextCode(tx, 'order');
  const cols = totalCols(t);
  const actor = actorOf(ctx);
  const row = await tx.order.create({
    data: {
      id,
      code,
      source: input.source ?? 'manual',
      channel: input.channel ?? '',
      ownerUserId,
      contactId: input.contact_id,
      quoteId: input.quote_id ?? null,
      contractId: input.contract_id ?? null,
      appointmentId: input.appointment_id ?? null,
      // DC-299: nhóm theo nguồn (báo giá → hợp đồng → lịch hẹn) → nhóm duy nhất của người phụ trách.
      teamId: await snapshotTeam(tx, { from: await orderSourceTeam(tx, input), owner: ownerUserId }),
      conversationId: input.conversation_id ?? null,
      depositRequired: deposit > 0n,
      depositAmount: deposit,
      headerDiscount: (input.header_discount ?? undefined) as object | undefined,
      ...cols,
      ...payCols({ status: 'new', total: cols.total, paidTotal: 0n, refundedTotal: 0n, depositRequired: deposit > 0n, depositAmount: deposit }),
      shipping: { ...EMPTY_SHIPPING, ...input.shipping },
      note: input.note?.trim() ?? '',
      createdByType: creatorOf(ctx),
      createdById: ctx.actor.type === 'agent' ? ctx.actor.id : actor.id,
      custom: (input.custom ?? {}) as object,
      createdAt: now,
      updatedAt: now,
    },
  });
  await writeItems(tx, id, lines, t, now);
  await logEvent(tx, id, 'created', actor, now);
  if (deposit > 0n) await logEvent(tx, id, 'deposit_set', actor, now, { amount: deposit });
  await writeTimeline(tx, { contactId: row.contactId, type: 'order', key: 'order_created', params: { code, total: t.total }, actor, ref: { type: 'order', id }, at: now });
  return { row, events: [{ topic: 'order.created', payload: orderPayload(row) }] };
}

/** Hoàn tác tạo (TIP-032c): huỷ giữ lịch sử khi đơn còn nguyên trạng — `editing/order-create-undo.ts`. */
export async function undoCreate(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date) {
  await undoOrderCreate(ctx, log, tx, now);
}

/** `after` của action tạo: id + phiên bản cuối sau toàn bộ đường tạo (biên nhận hoàn tác). */
export const createdAfter = async (tx: TenantTx, id: string) => createdReceipt(id, await orderVersion(tx, id));

@Injectable()
@ActionHandler('order.create')
export class OrderCreateHandler implements Handler<ActionInput<typeof orderCreate>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderCreate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    if (input.contract_id) {
      const c = UUID.test(input.contract_id) ? await tx.contract.findUnique({ where: { id: input.contract_id }, select: { contactId: true, deletedAt: true } }) : null;
      if (!c || c.deletedAt || c.contactId !== input.contact_id) throw new AppError('VALIDATION_FAILED', 422, { contract_id: 'not_found' });
    }
    const link = await linkConversation(tx, ctx.authz, input.contact_id, input, { served: ctx.servedConversationId });
    const { row, events } = await insertOrder(ctx, tx, this.members, { ...input, contact_id: link.contactId!, conversation_id: link.conversationId, source: input.contract_id ? 'contract' : 'manual' }, this.clock.now());
    return { result: { order_id: row.id, code: row.code }, after: await createdAfter(tx, row.id), events };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderCreate>, tx: TenantTx) {
    return createPreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('order.create_from_quote')
export class OrderFromQuoteHandler implements Handler<ActionInput<typeof orderCreateFromQuote>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderCreateFromQuote>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // Một báo giá → một HĐ hoặc một đơn (TIP-032b conversion-lock): khoá báo giá, đã có HĐ → QUOTE_ALREADY_CONVERTED; gọi lại → đơn cũ.
    const { quote: q, existing: dup } = await lockConversion(tx, ctx.authz, input.quote_id, 'order');
    if (dup) return { result: { order_id: dup.id, code: dup.code } };
    if (q.status !== 'accepted') throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
    const now = this.clock.now();
    const { row, events } = await insertOrder(
      ctx,
      tx,
      this.members,
      {
        contact_id: q.contactId,
        owner_user_id: q.ownerUserId ?? undefined,
        items: await linesOf(tx, q.id),
        header_discount: q.headerDiscount as Discount | null,
        note: q.note,
        source: 'quote',
        quote_id: q.id,
        conversation_id: q.conversationId,
        channel: q.sentChannel ?? '',
      },
      now,
    );
    await tx.quote.update({ where: { id: q.id }, data: { orderId: row.id, updatedAt: now } });
    return { result: { order_id: row.id, code: row.code }, after: await createdAfter(tx, row.id), events };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderCreateFromQuote>, tx: TenantTx) {
    return fromQuotePreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('order.create_from_contract')
export class OrderFromContractHandler implements Handler<ActionInput<typeof orderCreateFromContract>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderCreateFromContract>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // TIP-015f §2.5: khách → hợp đồng → đơn.
    await lockRootOf(tx, 'contract', input.contract_id);
    const c = UUID.test(input.contract_id) ? await tx.contract.findUnique({ where: { id: input.contract_id } }) : null;
    if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contract_id: 'not_found' });
    if (c.status !== 'signed') throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
    const q = c.quoteId ? await tx.quote.findUnique({ where: { id: c.quoteId }, select: { id: true, headerDiscount: true } }) : null;
    const items = q ? await linesOf(tx, q.id) : [{ name: c.title.trim() || c.code, qty: 1, unit_price: String(c.value), tax_rate: 0 as const }];
    const { row, events } = await insertOrder(
      ctx,
      tx,
      this.members,
      {
        contact_id: c.contactId,
        owner_user_id: c.ownerUserId ?? undefined,
        items,
        header_discount: (q?.headerDiscount as Discount | null) ?? null,
        source: 'contract',
        contract_id: c.id,
        conversation_id: c.conversationId,
        channel: c.sentChannel ?? '',
      },
      this.clock.now(),
    );
    return { result: { order_id: row.id, code: row.code }, after: await createdAfter(tx, row.id), events };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderCreateFromContract>, tx: TenantTx) {
    return fromContractPreview(ctx, tx, this.members, input);
  }
}

export { orderPayload, type Actor };
