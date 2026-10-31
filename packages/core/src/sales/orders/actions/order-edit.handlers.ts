// order.update · set_deposit · update_shipping (COMMERCE §4, §4b). Sửa tự do ở `new`; ở `processing` chỉ khi chưa thu khoản nào (đã thu
// → huỷ rồi tạo lại) — đổi dòng khi đã trừ kho thì hoàn kho lần cũ rồi trừ lại theo dòng mới. Đơn sàn (`locked_lines`): chỉ sửa người
// phụ trách / ghi chú / trường tuỳ biến. Vận chuyển nhập tay, sửa được cả sau khi hoàn tất. Hoàn tác = khôi phục ảnh chụp `before`.
import { Inject, Injectable } from '@nestjs/common';
import { TenantSql } from '@appchat/db';
import { AppError, ORDER_FLOW, SHIPPING_EDITABLE, assertTransition, mergeCustomValues, type CustomValues, type Discount } from '@appchat/shared';
import type { ActionInput, orderSetDeposit, orderUpdate, orderUpdateShipping } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CrmMembers } from '../../../crm/public';
import { checkParties, resolveLines, type LineIn } from '../../quotes/services/quote-write';
import { lockOrder, type OrderRecord } from '../order-access';
import { EMPTY_SHIPPING, actorOf, checkOrderCustom, deductStock, itemsOf, logEvent, payCols, returnStock, totalCols, totalsOf, writeItems, type Shipping } from '../services/order-write';

/** Ảnh chụp phần sửa được — `before` của action_log để hoàn tác. */
interface Snap {
  id: string;
  items: LineIn[];
  header: Discount | null;
  owner: string | null;
  note: string;
  deposit: string;
  shipping: Shipping;
  custom: CustomValues;
  event: string | null;
}

async function snap(tx: TenantTx, o: OrderRecord, event: string | null = null): Promise<Snap> {
  return {
    id: o.id,
    items: await itemsOf(tx, o.id),
    header: (o.headerDiscount as Discount | null) ?? null,
    owner: o.ownerUserId,
    note: o.note,
    deposit: String(o.depositAmount),
    shipping: { ...EMPTY_SHIPPING, ...(o.shipping as Partial<Shipping>) },
    custom: (o.custom ?? {}) as CustomValues,
    event,
  };
}

/** Khôi phục ảnh chụp (đơn phải còn ở trạng thái sửa được; đã thu tiền thì thôi). */
async function restore(tx: TenantTx, b: Snap, now: Date, lines: boolean) {
  await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${b.id}::uuid FOR UPDATE`;
  const o = await tx.order.findUnique({ where: { id: b.id } });
  if (!o || o.deletedAt || o.status === 'cancelled' || (lines && (o.status !== 'new' && o.status !== 'processing'))) throw new AppError('CONFLICT', 409, { order_id: 'changed' });
  if (lines && o.paidTotal > 0n) throw new AppError('CONFLICT', 409, { order_id: 'paid' });
  const t = totalsOf(b.items, b.header);
  const cols = totalCols(t);
  const deposit = BigInt(b.deposit);
  if (lines) {
    await writeItems(tx, o.id, b.items, t, now);
    if (o.status === 'processing' && o.stockRef) {
      await returnStock(tx, o, { type: 'system', id: null }, now);
      await deductStock(tx, o, { type: 'system', id: null }, now);
    }
  }
  await tx.order.update({
    where: { id: o.id },
    data: {
      ...(lines ? { ...cols, headerDiscount: b.header ? (b.header as object) : TenantSql.DbNull } : {}),
      ownerUserId: b.owner,
      note: b.note,
      depositRequired: deposit > 0n,
      depositAmount: deposit,
      shipping: b.shipping,
      custom: b.custom as object,
      ...payCols({ ...o, ...(lines ? { total: cols.total } : {}), depositRequired: deposit > 0n, depositAmount: deposit }),
      updatedAt: now,
    },
  });
  if (b.event) await tx.orderEvent.deleteMany({ where: { id: b.event } });
}

@Injectable()
@ActionHandler('order.update')
export class OrderUpdateHandler implements Handler<ActionInput<typeof orderUpdate>, { order_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ order_id: string }>> {
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    assertTransition(ORDER_FLOW, o.status, 'order.update');
    const p = input.patch;
    if (p.contact_id && p.contact_id !== o.contactId) throw new AppError('VALIDATION_FAILED', 422, { 'patch.contact_id': 'immutable' });
    if (p.contract_id !== undefined && p.contract_id !== (o.contractId ?? undefined)) throw new AppError('VALIDATION_FAILED', 422, { 'patch.contract_id': 'immutable' });
    const money = p.items !== undefined || p.header_discount !== undefined || p.deposit_amount !== undefined || p.shipping !== undefined;
    // Đơn sàn: sàn là nguồn sự thật (D31) — chỉ người phụ trách / ghi chú / trường tuỳ biến.
    if (o.lockedLines && money) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
    // Đang xử lý mà đã thu tiền → huỷ rồi tạo lại (COMMERCE §4).
    if (o.status === 'processing' && o.paidTotal > 0n && money) throw new AppError('INVALID_STATE', 409, { order_id: 'paid' });
    if (p.owner_user_id) await checkParties(ctx, tx, this.members, { contactId: o.contactId, ownerUserId: p.owner_user_id });
    await checkOrderCustom(ctx, tx, this.members, p.custom, 'update');
    const now = this.clock.now();
    const before = await snap(tx, o);
    const header = p.header_discount !== undefined ? p.header_discount : before.header;
    const lines = p.items ? (await resolveLines(tx, p.items)).lines : null;
    const t = totalsOf(lines ?? before.items, header);
    const cols = totalCols(t);
    const deposit = p.deposit_amount !== undefined ? BigInt(p.deposit_amount) : o.depositAmount;
    if (deposit > cols.total) throw new AppError('VALIDATION_FAILED', 422, { 'patch.deposit_amount': 'over_total' });
    if (lines) {
      await writeItems(tx, o.id, lines, t, now);
      if (o.status === 'processing' && o.stockRef) {
        await returnStock(tx, o, actorOf(ctx), now);
        await deductStock(tx, o, actorOf(ctx), now);
      }
    }
    await tx.order.update({
      where: { id: o.id },
      data: {
        ...cols,
        ...(p.header_discount !== undefined ? { headerDiscount: p.header_discount ? (p.header_discount as object) : TenantSql.DbNull } : {}),
        ...(p.owner_user_id ? { ownerUserId: p.owner_user_id } : {}),
        ...(p.note !== undefined ? { note: p.note.trim() } : {}),
        ...(p.shipping !== undefined ? { shipping: { ...before.shipping, ...p.shipping } } : {}),
        ...(p.custom !== undefined ? { custom: mergeCustomValues(before.custom, p.custom) as object } : {}),
        depositRequired: deposit > 0n,
        depositAmount: deposit,
        ...payCols({ ...o, total: cols.total, depositRequired: deposit > 0n, depositAmount: deposit }),
        updatedAt: now,
      },
    });
    return { result: { order_id: o.id }, before: { ...before, lines: !!lines || p.header_discount !== undefined } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Snap & { lines: boolean };
    await restore(tx, b, this.clock.now(), b.lines);
  }
}

@Injectable()
@ActionHandler('order.set_deposit')
export class OrderSetDepositHandler implements Handler<ActionInput<typeof orderSetDeposit>, { order_id: string; pay_status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderSetDeposit>, tx: TenantTx): Promise<HandlerOutcome<{ order_id: string; pay_status: string }>> {
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    assertTransition(ORDER_FLOW, o.status, 'order.set_deposit');
    if (o.lockedLines) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
    const deposit = BigInt(input.deposit_amount);
    if (deposit > o.total) throw new AppError('VALIDATION_FAILED', 422, { deposit_amount: 'over_total' });
    const now = this.clock.now();
    const event = await logEvent(tx, o.id, 'deposit_set', actorOf(ctx), now, { amount: deposit });
    const before = await snap(tx, o, event);
    const pay = payCols({ ...o, depositRequired: deposit > 0n, depositAmount: deposit });
    await tx.order.update({ where: { id: o.id }, data: { depositRequired: deposit > 0n, depositAmount: deposit, ...pay, updatedAt: now } });
    return { result: { order_id: o.id, pay_status: pay.payStatus }, before };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await restore(tx, log.before as Snap, this.clock.now(), false);
  }
}

@Injectable()
@ActionHandler('order.update_shipping')
export class OrderShippingHandler implements Handler<ActionInput<typeof orderUpdateShipping>, { order_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderUpdateShipping>, tx: TenantTx): Promise<HandlerOutcome<{ order_id: string }>> {
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    // Mã vận đơn có thể về sau khi hoàn tất → ngoài bảng ORDER_FLOW (completed là trạng thái cuối).
    if (!SHIPPING_EDITABLE.includes(o.status)) throw new AppError('INVALID_TRANSITION', 409, { status: o.status });
    const now = this.clock.now();
    const event = await logEvent(tx, o.id, 'shipping', actorOf(ctx), now);
    const before = await snap(tx, o, event);
    const s = Object.fromEntries(Object.entries(input.shipping).map(([k, v]) => [k, String(v ?? '').trim()]));
    await tx.order.update({ where: { id: o.id }, data: { shipping: { ...before.shipping, ...s }, updatedAt: now } });
    return { result: { order_id: o.id }, before };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Snap;
    const o = await tx.order.findUnique({ where: { id: b.id }, select: { id: true } });
    if (!o) return;
    await tx.order.update({ where: { id: b.id }, data: { shipping: b.shipping } });
    if (b.event) await tx.orderEvent.deleteMany({ where: { id: b.event } });
  }
}
