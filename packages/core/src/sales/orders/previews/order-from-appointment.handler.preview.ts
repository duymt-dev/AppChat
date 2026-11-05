// Preview tạo đơn từ lịch hẹn (TIP-023b R2.8): lịch đã hoàn thành ngoài liệu trình → khách + dịch vụ × giá hiện tại + mã lịch; lịch đã có
// đơn → báo trả lại đơn cũ (`existing:<mã>`); chưa hoàn thành → 409, buổi thuộc liệu trình → 409 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, orderCreateFromAppointment } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';
import type { CrmMembers } from '../../../crm/public';
import { inSalesScope } from '../../payments/invoice-access';
import { UUID } from '../order-access';
import { draftOrderPreview, label } from './order-create.handlers.preview';

export async function fromAppointmentPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof orderCreateFromAppointment>): Promise<ActionPreview> {
  const a = UUID.test(i.appointment_id) ? await tx.appointment.findUnique({ where: { id: i.appointment_id } }) : null;
  if (!a || a.deletedAt || !(await inSalesScope(tx, ctx.authz, { owner: a.ownerUserId, team: a.teamId, contact: a.contactId }, 'write'))) throw new AppError('NOT_FOUND', 404, { appointment_id: 'not_found' });
  const dup = a.orderId ? await tx.order.findUnique({ where: { id: a.orderId }, select: { code: true, contactId: true } }) : null;
  if (dup) return preview('write', await label(tx, dup), { changes: [], warnings: [`existing:${dup.code}`] });
  if (a.status !== 'done') throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
  if (a.packageId) throw new AppError('INVALID_STATE', 409, { appointment_id: 'package' });
  const svc = await tx.product.findUniqueOrThrow({ where: { id: a.serviceId }, select: { id: true, name: true, price: true, taxRate: true } });
  return draftOrderPreview(ctx, tx, members, {
    contact_id: a.contactId,
    owner_user_id: a.ownerUserId,
    items: [{ product_id: svc.id, name: svc.name, qty: 1, unit_price: String(svc.price), tax_rate: svc.taxRate }],
    source: 'appointment',
    from: a.code,
  });
}
