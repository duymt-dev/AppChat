// Preview hoàn tiền (TIP-023b R2.8): yêu cầu (risk money) → khách + số tiền (mặc định còn hoàn được / tỉ lệ buổi còn lại) + phương thức + lý
// do, vượt còn hoàn được → 422; duyệt / từ chối khoản chờ duyệt → khách + số tiền + đề nghị nguồn, pending → confirmed / failed; đã xử lý →
// 409, tự duyệt yêu cầu của chính mình (không phải Owner) → 403 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, paymentRefund, paymentRefundApprove, paymentRefundReject } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { actorUserId } from '../../../crm/public';
import { UUID, inSalesScope, visibleInvoice } from '../invoice-access';
import { invoiceRefundable, packageRefundable, refundMethodOf } from '../services/refunds';
import { money } from './invoice-write.handlers.preview';

export async function rejectPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof paymentRefundReject>): Promise<ActionPreview> {
  const p = UUID.test(i.payment_id) ? await tx.customerPayment.findUnique({ where: { id: i.payment_id } }) : null;
  if (!p || p.kind !== 'refund') throw new AppError('NOT_FOUND', 404, { payment_id: 'not_found' });
  if (p.status !== 'pending') throw new AppError('INVALID_STATE', 409, { status: p.status });
  if (!ctx.authz.isOwner && p.createdById && p.createdById === actorUserId(ctx)) throw new AppError('FORBIDDEN', 403, { payment_id: 'self_approval' });
  const [contact, inv] = await Promise.all([
    tx.contact.findUnique({ where: { id: p.contactId }, select: { name: true } }),
    p.invoiceId ? tx.invoice.findUnique({ where: { id: p.invoiceId }, select: { code: true } }) : null,
  ]);
  const amount = p.amount < 0n ? -p.amount : p.amount;
  return preview('write', line(contact?.name, money(amount), inv?.code), { changes: updated('payment', p.id, { status: p.status, note: null }, { status: 'failed', note: i.note.trim() }) });
}

export async function approvePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof paymentRefundApprove>): Promise<ActionPreview> {
  const p = UUID.test(i.payment_id) ? await tx.customerPayment.findUnique({ where: { id: i.payment_id } }) : null;
  if (!p || p.kind !== 'refund') throw new AppError('NOT_FOUND', 404, { payment_id: 'not_found' });
  if (p.status !== 'pending') throw new AppError('INVALID_STATE', 409, { status: p.status });
  if (!ctx.authz.isOwner && p.createdById && p.createdById === actorUserId(ctx)) throw new AppError('FORBIDDEN', 403, { payment_id: 'self_approval' });
  const [contact, inv] = await Promise.all([
    tx.contact.findUnique({ where: { id: p.contactId }, select: { name: true } }),
    p.invoiceId ? tx.invoice.findUnique({ where: { id: p.invoiceId }, select: { code: true } }) : null,
  ]);
  const amount = p.amount < 0n ? -p.amount : p.amount;
  return preview('money', line(contact?.name, money(amount), inv?.code), {
    changes: updated('payment', p.id, { status: p.status }, { status: 'confirmed', note: i.note?.trim() || undefined }),
    warnings: [`pay_out:${p.method}`],
  });
}

/** Còn hoàn được theo liệu trình: tỉ lệ buổi còn lại, chặn bởi đã thu − đã hoàn của đơn (+ khoản hoàn đang chờ đã trừ sẵn). */
async function packageRoom(ctx: ActionContext, tx: TenantTx, id: string) {
  const p = UUID.test(id) ? await tx.customerPackage.findUnique({ where: { id } }) : null;
  const o = p ? await tx.order.findUnique({ where: { id: p.orderId }, select: { id: true, assignedUserId: true, teamId: true, contactId: true, paidTotal: true, refundedTotal: true } }) : null;
  if (!p || !o || !(await inSalesScope(tx, ctx.authz, { owner: o.assignedUserId, team: o.teamId, contact: o.contactId }, 'write'))) throw new AppError('NOT_FOUND', 404, { package_id: 'not_found' });
  if (p.status === 'refunded') throw new AppError('INVALID_STATE', 409, { status: p.status });
  if (await tx.customerPayment.count({ where: { packageId: p.id, kind: 'refund', status: 'pending' } })) throw new AppError('INVALID_STATE', 409, { package_id: 'refund_pending' });
  const pending = (await tx.customerPayment.findMany({ where: { orderId: o.id, kind: 'refund', status: 'pending' }, select: { amount: true } })).reduce((a, x) => a + x.amount, 0n);
  const room = o.paidTotal - o.refundedTotal + pending;
  const share = await packageRefundable(tx, p);
  return { contactId: p.contactId, room, fallback: share < room ? share : room, source: `${p.usedSessions}/${p.totalSessions}`, method: await refundMethodOf(tx, { orderId: p.orderId }) };
}

export async function requestPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof paymentRefund>): Promise<ActionPreview> {
  const want = i.amount ? BigInt(i.amount) : null;
  const r = i.invoice_id
    ? await (async () => {
        const inv = await visibleInvoice(tx, ctx.authz, i.invoice_id!, 'write');
        const room = await invoiceRefundable(tx, inv.id);
        return { contactId: inv.contactId, room, fallback: room, source: inv.code, method: await refundMethodOf(tx, { invoiceId: inv.id }) };
      })()
    : await packageRoom(ctx, tx, i.package_id!);
  const amount = want ?? r.fallback;
  if (r.room <= 0n || amount > r.room) throw new AppError('VALIDATION_FAILED', 422, { amount: r.room <= 0n ? 'nothing_to_refund' : 'over_refundable' });
  const contact = await tx.contact.findUnique({ where: { id: r.contactId }, select: { name: true } });
  return preview('money', line(contact?.name, money(amount), r.source), {
    changes: [created('payment', { kind: 'refund', status: 'pending', amount: String(amount), method: r.method, reason: i.reason.trim() })],
    warnings: ['needs_approval'],
  });
}
