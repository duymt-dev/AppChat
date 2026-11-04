// payment.redeem_points (TIP-036, COMMERCE §7, Blueprint §3.4): trả một phần đề nghị thanh toán bằng điểm — khoản thu kind / method
// `points` qua đường ghi khoản thu chung (phiếu thu, đã thu của đề nghị + đơn, timeline). Khách / đơn suy ra từ đề nghị; đề nghị phải còn
// phải thu và gắn đơn chưa huỷ. Khoá đề nghị → đơn → khách → lô (thứ tự chung): tổng điểm dùng trên đơn (mọi đề nghị) ≤ 50% giá trị đơn,
// tiền ≤ còn phải thu, số dư ≥ điểm (số dư âm chặn đổi — DC-297 a); trừ FIFO. Hai lệnh đồng thời cùng đơn xếp hàng ở khoá đơn — không vượt
// trần / không tiêu hai lần. Hoàn tác 24h: khoản thu → failed (không xoá), trả điểm đúng lô (giữ hạn gốc — DC-297 b).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, maxRedeemPoints, pointsValue, safePoints } from '@appchat/shared';
import type { ActionInput, ActionPreview, paymentRedeemPoints } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { writeTimeline } from '../../crm/public';
import { actorOf } from '../../sales/orders/services/order-write';
import { lockInvoice, visibleInvoice, type InvoiceRecord } from '../../sales/payments/invoice-access';
import { localDay, recordInvoicePayment, voidPointsPayment } from '../../sales/payments/services/payment-write';
import { QuoteDeps } from '../../sales/quotes/services/quote-deps';
import { lockMember } from '../repos/ledger.repo';
import { readConfig } from '../services/config.service';
import { post, restoreDebit } from '../services/ledger.service';
import { pointsChanged } from '../services/order-points';

type In = ActionInput<typeof paymentRedeemPoints>;
type Out = { payment_id: string; invoice_id: string; order_id: string; points: number; amount: string; balance_after: number };
type Before = { invoice_id: string; payment_id: string; order_event_id: string | null; status: 'draft' | 'sent' | 'partial' | 'overdue'; paid: string; points: number; ledger_id: string; contact_id: string };

/** Kiểm điều kiện đổi (không ghi): đề nghị + đơn + trần 50% + còn phải thu + số dư. Đơn / khách đã khoá khi `lock`. */
async function check(tx: TenantTx, inv: InvoiceRecord, points: number, lock: boolean) {
  if (!inv.orderId) throw new AppError('INVALID_STATE', 409, { invoice_id: 'no_order' });
  if (!(await readConfig(tx)).enabled) throw new AppError('INVALID_STATE', 409, { loyalty: 'disabled' });
  if (lock) await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${inv.orderId}::uuid FOR UPDATE`;
  const o = await tx.order.findUniqueOrThrow({ where: { id: inv.orderId } });
  if (o.status === 'cancelled') throw new AppError('INVALID_STATE', 409, { order_id: 'cancelled' });
  const cap = maxRedeemPoints(o.total);
  const want = BigInt(points);
  if (o.pointsUsed + want > cap) throw new AppError('VALIDATION_FAILED', 422, { points: 'over_cap', max: String(cap - o.pointsUsed > 0n ? cap - o.pointsUsed : 0n) });
  const amount = pointsValue(want);
  if (amount > inv.amount - inv.paidAmount) throw new AppError('VALIDATION_FAILED', 422, { points: 'over_due' });
  const m = lock ? await lockMember(tx, inv.contactId) : await tx.contact.findUnique({ where: { id: inv.contactId }, select: { id: true, pointsBalance: true } }).then((c) => (c ? { id: c.id, points_balance: c.pointsBalance } : null));
  if (!m) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  if (m.points_balance < want) throw new AppError('VALIDATION_FAILED', 422, { points: 'insufficient' });
  return { o, amount, balance: m.points_balance, cap };
}

@Injectable()
@ActionHandler('payment.redeem_points')
export class PaymentRedeemPointsHandler implements Handler<In, Out> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const inv = await lockInvoice(tx, ctx.authz, i.invoice_id);
    const { o, amount, balance } = await check(tx, inv, i.points, true);
    const now = this.clock.now();
    const actor = actorOf(ctx);
    const today = localDay(now, (await this.d.place(ctx.workspaceId)).timeZone);
    const p = await post(tx, { contactId: inv.contactId, kind: 'redeem', delta: -BigInt(i.points), balance, actor, now, ref: { type: 'invoice', id: inv.id } });
    await tx.order.update({ where: { id: o.id }, data: { pointsUsed: { increment: BigInt(i.points) } } });
    const r = await recordInvoicePayment(tx, inv, { amount, method: 'points', kind: 'points', reference: `${i.points}`, paidAt: now, actor }, today, now);
    await writeTimeline(tx, { contactId: inv.contactId, type: 'loyalty', key: 'loyalty_redeem', params: { points: String(i.points), amount: String(amount), code: inv.code }, actor, ref: { type: 'invoice', id: inv.id }, at: now });
    const before: Before = { invoice_id: inv.id, payment_id: r.paymentId, order_event_id: r.orderEventId, status: inv.status as Before['status'], paid: String(inv.paidAmount), points: i.points, ledger_id: p.id, contact_id: inv.contactId };
    return {
      result: { payment_id: r.paymentId, invoice_id: inv.id, order_id: o.id, points: i.points, amount: String(amount), balance_after: safePoints(p.balanceAfter) },
      before,
      events: [...r.events, pointsChanged(inv.contactId, 'redeem', p)],
    };
  }

  /** Ghi bù: khoản thu → failed, đã thu / điểm dùng của đơn trừ lại, điểm trả đúng lô đã trừ. */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Before;
    const now = this.clock.now();
    await voidPointsPayment(tx, b, 'undo', now);
    const m = await lockMember(tx, b.contact_id);
    if (!m) throw new AppError('CONFLICT', 409, { contact_id: 'changed' });
    await restoreDebit(tx, b.ledger_id, m.points_balance, actorOf(ctx), now, 'undo');
  }

  async preview(ctx: ActionContext, i: In, tx: TenantTx): Promise<ActionPreview> {
    const inv = await visibleInvoice(tx, ctx.authz, i.invoice_id);
    const c = await check(tx, inv, i.points, false);
    const before = safePoints(c.balance);
    return preview('money', line(inv.code, `${i.points}`, String(c.amount)), {
      changes: [
        { entity: 'loyalty_member', id: inv.contactId, before: { points: before }, after: { points: before - i.points } },
        { entity: 'invoice', id: inv.id, before: { paid: String(inv.paidAmount) }, after: { paid: String(inv.paidAmount + c.amount), method: 'points' } },
      ],
    });
  }
}
