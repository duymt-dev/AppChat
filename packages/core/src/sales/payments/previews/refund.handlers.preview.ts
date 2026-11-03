// Preview từ chối hoàn tiền (TIP-023b R2.8): khoản hoàn chờ duyệt → khách + số tiền + đề nghị / liệu trình nguồn + ghi chú; đã xử lý → 409,
// tự duyệt yêu cầu của chính mình (không phải Owner) → 403 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, paymentRefundReject } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { actorUserId } from '../../../crm/public';
import { UUID } from '../invoice-access';
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
