// payment.refund · refund_approve · refund_reject (COMMERCE §4–6; Blueprint §3.4 "luôn duyệt"; DV-013). Yêu cầu: theo đề nghị (số ≤ đã thu
// còn hoàn được, mặc định toàn bộ) hoặc theo liệu trình (mặc định tỉ lệ buổi còn lại) → khoản hoàn `pending` + thông báo người có
// `payment.refund_approve`. Duyệt / từ chối: người duyệt không phải người yêu cầu (trừ Owner — một người vận hành, D07) → kết quả báo
// người yêu cầu. Không hoàn tác (tiền đã trả ra — muốn sửa thì ghi khoản thu mới).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, createFmt } from '@appchat/shared';
import type { ActionInput, paymentRefund, paymentRefundApprove, paymentRefundReject } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CrmMembers, actorUserId } from '../../../crm/public';
import { actorOf } from '../../orders/services/order-write';
import { UUID, inSalesScope, lockInvoice } from '../invoice-access';
import { approvePreview, rejectPreview, requestPreview } from '../previews/refund.handlers.preview';
import { approveRefund, invoiceRefundable, lockPendingRefund, packageRefundable, refundMethodOf, rejectRefund, requestRefund, type RefundRow } from '../services/refunds';

type Ev = { topic: string; payload: Record<string, unknown> };
const cut = (s: string) => s.slice(0, 200);
const money = (v: bigint) => createFmt({ locale: 'vi' }).money(String(v));

async function refundNotice(tx: TenantTx, members: CrmMembers, p: { contactId: string; amount: bigint }, actorId: string | null) {
  const [actor, contact] = await Promise.all([
    actorId ? members.names([actorId]).then((m) => m.get(actorId) ?? '') : Promise.resolve(''),
    tx.contact.findUnique({ where: { id: p.contactId }, select: { name: true } }),
  ]);
  return { actor: cut(actor), contact: cut(contact?.name ?? ''), amount: money(p.amount < 0n ? -p.amount : p.amount) };
}

@Injectable()
@ActionHandler('payment.refund')
export class PaymentRefundHandler implements Handler<ActionInput<typeof paymentRefund>, { payment_id: string; status: string; amount: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof paymentRefund>, tx: TenantTx): Promise<HandlerOutcome<{ payment_id: string; status: string; amount: string }>> {
    const now = this.clock.now();
    const actor = actorOf(ctx);
    const want = input.amount ? BigInt(input.amount) : null;
    let r: Parameters<typeof requestRefund>[1];
    if (input.invoice_id) {
      const i = await lockInvoice(tx, ctx.authz, input.invoice_id);
      if (i.orderId) await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${i.orderId}::uuid FOR UPDATE`;
      const room = await invoiceRefundable(tx, i.id);
      const amount = want ?? room;
      if (room <= 0n || amount > room) throw new AppError('VALIDATION_FAILED', 422, { amount: room <= 0n ? 'nothing_to_refund' : 'over_refundable' });
      r = { contactId: i.contactId, orderId: i.orderId, invoiceId: i.id, packageId: null, amount, method: await refundMethodOf(tx, { invoiceId: i.id }), reason: input.reason, actor };
    } else {
      const id = input.package_id!;
      if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${id}::uuid FOR UPDATE`;
      const p = UUID.test(id) ? await tx.customerPackage.findUnique({ where: { id } }) : null;
      const o = p ? await tx.order.findUnique({ where: { id: p.orderId }, select: { id: true, assignedUserId: true, teamId: true, contactId: true } }) : null;
      if (!p || !o || !(await inSalesScope(tx, ctx.authz, { owner: o.assignedUserId, team: o.teamId, contact: o.contactId }, 'write'))) throw new AppError('NOT_FOUND', 404, { package_id: 'not_found' });
      if (p.status === 'refunded') throw new AppError('INVALID_STATE', 409, { status: p.status });
      if (await tx.customerPayment.count({ where: { packageId: p.id, kind: 'refund', status: 'pending' } })) throw new AppError('INVALID_STATE', 409, { package_id: 'refund_pending' });
      await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${o.id}::uuid FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: o.id }, select: { paidTotal: true, refundedTotal: true } });
      const pending = (await tx.customerPayment.findMany({ where: { orderId: o.id, kind: 'refund', status: 'pending' }, select: { amount: true } })).reduce((a, x) => a + x.amount, 0n);
      const room = order.paidTotal - order.refundedTotal + pending;
      const share = await packageRefundable(tx, p);
      const amount = want ?? (share < room ? share : room);
      if (room <= 0n || amount > room) throw new AppError('VALIDATION_FAILED', 422, { amount: room <= 0n ? 'nothing_to_refund' : 'over_refundable' });
      r = { contactId: p.contactId, orderId: p.orderId, invoiceId: null, packageId: p.id, amount, method: await refundMethodOf(tx, { orderId: p.orderId }), reason: input.reason, actor };
    }
    const out = await requestRefund(tx, r, now);
    if (r.orderId) await tx.order.update({ where: { id: r.orderId }, data: { refundPending: true, updatedAt: now } });
    const params = await refundNotice(tx, this.members, { contactId: r.contactId, amount: r.amount }, actorUserId(ctx));
    const me = actorUserId(ctx);
    const notify: Ev = { topic: 'notify.requested', payload: { kind: 'refund_approval', to: { permission: 'payment.refund_approve' }, params, link: r.invoiceId ? `/invoices?q=${r.invoiceId}` : '/invoices', ...(me ? { exclude_user_id: me } : {}) } };
    return { result: { payment_id: out.paymentId, status: 'pending', amount: String(r.amount) }, events: [...out.events, notify] };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof paymentRefund>, tx: TenantTx) {
    return requestPreview(ctx, tx, input);
  }
}

/** Kết quả duyệt gửi người yêu cầu (nếu là người dùng khác người duyệt). */
function decidedNotice(p: RefundRow, variant: 'approved' | 'rejected', params: Record<string, string>, me: string | null): Ev[] {
  const to = p.createdByType === 'user' && p.createdById && UUID.test(p.createdById) && p.createdById !== me ? p.createdById : null;
  return to ? [{ topic: 'notify.requested', payload: { kind: 'refund_approval', to: { user_ids: [to] }, params: { ...params, variant }, link: p.invoiceId ? `/invoices?q=${p.invoiceId}` : '/invoices' } }] : [];
}

/** Người duyệt khác người yêu cầu (tách nhiệm vụ) — Owner được tự duyệt (doanh nghiệp một người). */
function assertSeparation(ctx: ActionContext, p: RefundRow) {
  if (!ctx.authz.isOwner && p.createdById && p.createdById === actorUserId(ctx)) throw new AppError('FORBIDDEN', 403, { payment_id: 'self_approval' });
}

@Injectable()
@ActionHandler('payment.refund_approve')
export class PaymentRefundApproveHandler implements Handler<ActionInput<typeof paymentRefundApprove>, { payment_id: string; status: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof paymentRefundApprove>, tx: TenantTx): Promise<HandlerOutcome<{ payment_id: string; status: string }>> {
    const p = await lockPendingRefund(tx, input.payment_id);
    assertSeparation(ctx, p);
    const events = await approveRefund(tx, p, actorOf(ctx), input.note ?? '', this.clock.now());
    const params = await refundNotice(tx, this.members, p, actorUserId(ctx));
    return { result: { payment_id: p.id, status: 'confirmed' }, events: [...events, ...decidedNotice(p, 'approved', params, actorUserId(ctx))] };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof paymentRefundApprove>, tx: TenantTx) {
    return approvePreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('payment.refund_reject')
export class PaymentRefundRejectHandler implements Handler<ActionInput<typeof paymentRefundReject>, { payment_id: string; status: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof paymentRefundReject>, tx: TenantTx): Promise<HandlerOutcome<{ payment_id: string; status: string }>> {
    const p = await lockPendingRefund(tx, input.payment_id);
    assertSeparation(ctx, p);
    const events = await rejectRefund(tx, p, actorOf(ctx), input.note, this.clock.now());
    const params = await refundNotice(tx, this.members, p, actorUserId(ctx));
    return { result: { payment_id: p.id, status: 'failed' }, events: [...events, ...decidedNotice(p, 'rejected', params, actorUserId(ctx))] };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof paymentRefundReject>, tx: TenantTx) {
    return rejectPreview(ctx, tx, input);
  }
}
