// order.create_from_appointment (Blueprint §3.4 sales, COMMERCE 8b): lịch hẹn đã hoàn thành NGOÀI liệu trình → người / agent xác nhận
// gợi ý "Tạo đơn cho buổi này?" → đơn `new` một dòng dịch vụ × giá hiện tại, nguồn `appointment`; mỗi lịch một đơn (gọi lại trả đơn cũ),
// ghi `appointment.order_id`. Buổi thuộc liệu trình đã thu qua đơn gói → 409. Hoàn tác khi đơn còn `new`.
// TIP-033c §3: xem trước BẮT BUỘC (policy MANDATORY_PREVIEW_ACTIONS) — token ràng version lịch + version / giá / thuế dịch vụ + khách gốc;
// thực thi khoá khách → lịch rồi đọc lại qua nguồn chung của booking (conversionSource), lệch → 409 xem trước lại, 0 ghi.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, orderCreateFromAppointment } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CrmMembers } from '../../../crm/public';
import { conversionSource } from '../../../booking/order-suggestions/preview';
import { assertBoundPreview } from '../../../kernel/actions/preview-binding';
import { visibleOrder } from '../order-access';
import { createdAfter, insertOrder, undoCreate } from './order-create.handlers';
import { fromAppointmentPreview } from '../previews/order-from-appointment.handler.preview';
import { lockRootOf } from '../../../kernel/ownership/root-lock';

type Out = { order_id: string; code: string; reused: boolean };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
@ActionHandler('order.create_from_appointment')
export class OrderFromAppointmentHandler implements Handler<ActionInput<typeof orderCreateFromAppointment>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderCreateFromAppointment>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // Nguồn đọc qua facade booking (booking không import sales — không vòng). TIP-015f §2.5: khách → lịch hẹn → đơn.
    await lockRootOf(tx, 'appointment', input.appointment_id);
    if (UUID_RE.test(input.appointment_id)) await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${input.appointment_id}::uuid FOR UPDATE`;
    const src = await conversionSource(tx, ctx.authz, input.appointment_id);
    if (src.kind === 'linked') {
      // Đơn đã có (client khác / gửi lại): trả biên nhận "đã có" chỉ khi người gọi còn thấy đơn đó — không lộ mã đơn ngoài scope.
      const o = await visibleOrder(tx, ctx.authz, src.orderId).catch(() => null);
      if (!o) throw new AppError('CONFLICT', 409, { appointment_id: 'linked' });
      return { result: { order_id: o.id, code: o.code, reused: true }, noUndo: true };
    }
    assertBoundPreview(ctx.previewFacts, src.facts);
    const { appointment: a, service: svc } = src;
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
    return { result: { order_id: row.id, code: row.code, reused: false }, after: { ...(await createdAfter(tx, row.id)), appointment_id: a.id }, events };
  }

  /** TIP-032c: huỷ giữ lịch sử — liên kết lịch hẹn ↔ đơn giữ nguyên (không thành lần chuyển đổi thứ hai âm thầm). */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderCreateFromAppointment>, tx: TenantTx) {
    return fromAppointmentPreview(ctx, tx, this.members, input);
  }

  /** Dữ kiện ràng vào confirm_token (§3.1) — lịch đã có đơn thì không ràng gì (thực thi trả biên nhận đơn sẵn có). */
  async bindPreview(ctx: ActionContext, input: ActionInput<typeof orderCreateFromAppointment>, tx: TenantTx) {
    const src = await conversionSource(tx, ctx.authz, input.appointment_id);
    return src.kind === 'new' ? src.facts : {};
  }
}
