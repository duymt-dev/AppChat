// Preview tạo đơn từ lịch hẹn (TIP-023b R2.8, TIP-033c §3.1): nguồn chung của booking (conversionSource) — lịch đã hoàn thành ngoài liệu
// trình → khách + dịch vụ × giá hiện tại + mã lịch; lịch đã có đơn → báo trả lại đơn cũ (`existing:<mã>`, chỉ khi còn thấy đơn đó); chưa
// hoàn thành / thuộc liệu trình / dịch vụ ngừng bán → 409 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, orderCreateFromAppointment } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';
import type { CrmMembers } from '../../../crm/public';
import { conversionSource } from '../../../booking/order-suggestions/preview';
import { visibleOrder } from '../order-access';
import { draftOrderPreview, label } from './order-create.handlers.preview';

export async function fromAppointmentPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof orderCreateFromAppointment>): Promise<ActionPreview> {
  const src = await conversionSource(tx, ctx.authz, i.appointment_id);
  if (src.kind === 'linked') {
    const dup = await visibleOrder(tx, ctx.authz, src.orderId).catch(() => null);
    if (!dup) throw new AppError('CONFLICT', 409, { appointment_id: 'linked' });
    return preview('write', await label(tx, dup), { changes: [], warnings: [`existing:${dup.code}`] });
  }
  const { appointment: a, service: svc } = src;
  return draftOrderPreview(ctx, tx, members, {
    contact_id: a.contactId,
    owner_user_id: a.ownerUserId,
    items: [{ product_id: svc.id, name: svc.name, qty: 1, unit_price: String(svc.price), tax_rate: svc.taxRate }],
    source: 'appointment',
    from: a.code,
  });
}
