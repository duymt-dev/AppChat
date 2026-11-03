// order.confirm · complete · cancel (COMMERCE §4, §7, §8; state-machine §4). Xác nhận = new → processing: trừ kho (combo theo thành phần).
// Hoàn tất = processing → completed: điểm floor(net trước VAT / 10.000) × hệ số hạng ghi trên đơn một lần (sổ điểm + số dư khách —
// TIP-036 nhận `order.completed`), đơn sàn mặc định 0 điểm (§4b — trừ khi kết nối bật `loyalty_enabled`); khách → Đã mua, tổng chi,
// lần mua cuối. Huỷ = new / processing → cancelled: bắt buộc lý do, hoàn kho, đã thu tiền → cờ chờ hoàn tiền + event (TIP-032 sinh
// yêu cầu hoàn tiền chờ duyệt — payments/services/order-refund.ts). Huỷ không hoàn tác (Blueprint §3.4).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, ORDER_FLOW, assertTransition, pointsFor } from '@appchat/shared';
import type { ActionInput, orderCancel, orderComplete, orderConfirm } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { applyStageRule, writeTimeline } from '../../../crm/public';
import { lockOrder, type OrderRecord } from '../order-access';
import { actorOf, deductStock, logEvent, moveOrder, returnStock, type Actor } from '../services/order-write';
import { orderPayload } from './order-create.handlers';
import { refundCancelled } from '../../payments/services/order-refund';
import { cancelPreview, completePreview, confirmPreview, earns, netBeforeVat } from '../previews/order-flow.handlers.preview';

type St = { order_id: string; status: string };

/** Hoàn tất (dùng chung action + đồng bộ sàn): điểm, khách Đã mua / tổng chi / lần mua cuối, timeline, event. */
export async function completeOrder(tx: TenantTx, o: OrderRecord, actor: Actor, now: Date) {
  const contact = await tx.contact.findUniqueOrThrow({ where: { id: o.contactId }, select: { tierKey: true } });
  const net = netBeforeVat(o);
  const points = (await earns(tx, o)) ? pointsFor(net, contact.tierKey) : 0;
  await moveOrder(tx, o, 'completed', { completedAt: now, pointsEarned: points }, now);
  const event = await logEvent(tx, o.id, 'completed', actor, now, { points });
  await tx.contact.update({ where: { id: o.contactId }, data: { totalSpent: { increment: o.total }, lastOrderAt: now } });
  await writeTimeline(tx, { contactId: o.contactId, type: 'order', key: 'order_completed', params: { code: o.code, total: String(o.total) }, actor, ref: { type: 'order', id: o.id }, at: now });
  const stage = await applyStageRule(tx, { contactId: o.contactId, mode: 'raise', to: 'won', actor, now });
  return { points, event, events: [{ topic: 'order.completed', payload: { ...orderPayload(o), points, net_before_vat: String(net) } }, ...stage] };
}

/** Huỷ (dùng chung action + đồng bộ sàn). */
export async function cancelOrder(tx: TenantTx, o: OrderRecord, reason: string, actor: Actor, now: Date) {
  await returnStock(tx, o, actor, now);
  const paid = o.paidTotal - o.refundedTotal;
  const refund = paid > 0n;
  await moveOrder(tx, o, 'cancelled', { cancelledAt: now, cancelReason: reason, refundPending: refund }, now);
  await logEvent(tx, o.id, 'cancelled', actor, now, { reason });
  if (refund) await logEvent(tx, o.id, 'refund_requested', actor, now, { amount: paid });
  await writeTimeline(tx, { contactId: o.contactId, type: 'order', key: 'order_cancelled', params: { code: o.code, reason }, actor, ref: { type: 'order', id: o.id }, at: now });
  // Đã thu → yêu cầu hoàn tiền chờ duyệt (TIP-032 — COMMERCE §4), cùng transaction với huỷ.
  const refunds = refund ? await refundCancelled(tx, o, reason, actor, now) : [];
  return { refund, events: [{ topic: 'order.cancelled', payload: { ...orderPayload(o), reason, paid_total: String(paid), refund_requested: refund } }, ...refunds] };
}

@Injectable()
@ActionHandler('order.confirm')
export class OrderConfirmHandler implements Handler<ActionInput<typeof orderConfirm>, St & { low_stock: string[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderConfirm>, tx: TenantTx): Promise<HandlerOutcome<St & { low_stock: string[] }>> {
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    const to = assertTransition(ORDER_FLOW, o.status, 'order.confirm');
    const now = this.clock.now();
    const actor = actorOf(ctx);
    await moveOrder(tx, o, to, { confirmedAt: now }, now);
    const { low } = await deductStock(tx, o, actor, now);
    const event = await logEvent(tx, o.id, 'confirmed', actor, now);
    await writeTimeline(tx, { contactId: o.contactId, type: 'order', key: 'order_confirmed', params: { code: o.code }, actor, ref: { type: 'order', id: o.id }, at: now });
    return { result: { order_id: o.id, status: to, low_stock: low }, before: { id: o.id, event }, events: [{ topic: 'order.confirmed', payload: orderPayload(o) }] };
  }

  /** Về `new` + hoàn kho (chưa thu tiền, chưa hoàn tất). */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; event: string };
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${b.id}::uuid FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: b.id } });
    if (!o || o.status !== 'processing' || o.paidTotal > 0n) throw new AppError('CONFLICT', 409, { order_id: 'changed' });
    const now = this.clock.now();
    await returnStock(tx, o, { type: 'system', id: null }, now);
    await moveOrder(tx, o, 'new', { confirmedAt: null }, now);
    await tx.orderEvent.deleteMany({ where: { id: b.event } });
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderConfirm>, tx: TenantTx) {
    return confirmPreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('order.complete')
export class OrderCompleteHandler implements Handler<ActionInput<typeof orderComplete>, St & { points: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderComplete>, tx: TenantTx): Promise<HandlerOutcome<St & { points: number }>> {
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    const to = assertTransition(ORDER_FLOW, o.status, 'order.complete');
    const r = await completeOrder(tx, o, actorOf(ctx), this.clock.now());
    return { result: { order_id: o.id, status: to, points: r.points }, before: { id: o.id, event: r.event, total: String(o.total) }, events: r.events };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderComplete>, tx: TenantTx) {
    return completePreview(ctx, tx, input);
  }

  /** Về `processing`: bỏ điểm ghi trên đơn + trừ lại tổng chi; giai đoạn Đã mua giữ nguyên (không bao giờ hạ — §8). */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; event: string; total: string };
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${b.id}::uuid FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: b.id } });
    if (!o || o.status !== 'completed') throw new AppError('CONFLICT', 409, { order_id: 'changed' });
    const now = this.clock.now();
    await moveOrder(tx, o, 'processing', { completedAt: null, pointsEarned: 0 }, now);
    await tx.contact.update({ where: { id: o.contactId }, data: { totalSpent: { decrement: BigInt(b.total) } } });
    await tx.orderEvent.deleteMany({ where: { id: b.event } });
  }
}

@Injectable()
@ActionHandler('order.cancel')
export class OrderCancelHandler implements Handler<ActionInput<typeof orderCancel>, St & { refund_requested: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderCancel>, tx: TenantTx): Promise<HandlerOutcome<St & { refund_requested: boolean }>> {
    const o = await lockOrder(tx, ctx.authz, input.order_id);
    const to = assertTransition(ORDER_FLOW, o.status, 'order.cancel');
    const r = await cancelOrder(tx, o, input.reason.trim(), actorOf(ctx), this.clock.now());
    return { result: { order_id: o.id, status: to, refund_requested: r.refund }, before: { id: o.id, status: o.status }, events: r.events };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderCancel>, tx: TenantTx) {
    return cancelPreview(ctx, tx, input);
  }
}
