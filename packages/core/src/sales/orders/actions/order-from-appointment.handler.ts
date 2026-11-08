// order.create_from_appointment (Blueprint §3.4 sales, COMMERCE 8b): lịch hẹn đã hoàn thành NGOÀI liệu trình → người / agent xác nhận
// gợi ý "Tạo đơn cho buổi này?" → đơn `new` một dòng dịch vụ × giá hiện tại, nguồn `appointment`; mỗi lịch một đơn (gọi lại trả đơn cũ),
// ghi `appointment.order_id`. Buổi thuộc liệu trình đã thu qua đơn gói → 409. Hoàn tác khi đơn còn `new`.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, orderCreateFromAppointment } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CrmMembers } from '../../../crm/public';
import { inSalesScope } from '../../payments/invoice-access';
import { UUID } from '../order-access';
import { createdAfter, insertOrder, undoCreate } from './order-create.handlers';
import { fromAppointmentPreview } from '../previews/order-from-appointment.handler.preview';

type Out = { order_id: string; code: string };

@Injectable()
@ActionHandler('order.create_from_appointment')
export class OrderFromAppointmentHandler implements Handler<ActionInput<typeof orderCreateFromAppointment>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderCreateFromAppointment>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // Đọc lịch trực tiếp (không import domain booking — tránh vòng sales ↔ booking); quyền theo scope sales của người phụ trách.
    if (UUID.test(input.appointment_id)) await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${input.appointment_id}::uuid FOR UPDATE`;
    const a = UUID.test(input.appointment_id) ? await tx.appointment.findUnique({ where: { id: input.appointment_id } }) : null;
    if (!a || a.deletedAt || !(await inSalesScope(tx, ctx.authz, { owner: a.ownerUserId, team: a.teamId, contact: a.contactId }, 'write'))) throw new AppError('NOT_FOUND', 404, { appointment_id: 'not_found' });
    if (a.orderId) {
      const o = await tx.order.findUnique({ where: { id: a.orderId }, select: { id: true, code: true } });
      if (o) return { result: { order_id: o.id, code: o.code } };
    }
    if (a.status !== 'done') throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
    if (a.packageId) throw new AppError('INVALID_STATE', 409, { appointment_id: 'package' });
    const svc = await tx.product.findUniqueOrThrow({ where: { id: a.serviceId }, select: { id: true, name: true, price: true, taxRate: true } });
    const now = this.clock.now();
    const { row, events } = await insertOrder(
      ctx,
      tx,
      this.members,
      {
        contact_id: a.contactId,
        owner_user_id: a.ownerUserId ?? undefined,
        items: [{ product_id: svc.id, name: svc.name, qty: 1, unit_price: String(svc.price), tax_rate: svc.taxRate }],
        note: a.code,
        source: 'appointment',
        appointment_id: a.id,
        conversation_id: a.conversationId,
      },
      now,
    );
    await tx.appointment.update({ where: { id: a.id }, data: { orderId: row.id, updatedAt: now } });
    return { result: { order_id: row.id, code: row.code }, after: { ...(await createdAfter(tx, row.id)), appointment_id: a.id }, events };
  }

  /** TIP-032c: huỷ giữ lịch sử — liên kết lịch hẹn ↔ đơn giữ nguyên (không thành lần chuyển đổi thứ hai âm thầm). */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderCreateFromAppointment>, tx: TenantTx) {
    return fromAppointmentPreview(ctx, tx, this.members, input);
  }
}
