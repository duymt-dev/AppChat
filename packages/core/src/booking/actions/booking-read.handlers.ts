// appointment.get (TIP-023b R2 · DC-224): Trợ lý / agent đọc lịch hẹn — `visibleAppointment` (ngoài scope → NOT_FOUND). Tra nhân sự /
// dịch vụ theo tên ở booking-reference-read.handlers.ts.
import { Injectable } from '@nestjs/common';
import type { ActionInput, appointmentGet } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleAppointment } from '../booking-access';

@Injectable()
@ActionHandler('appointment.get')
export class AppointmentGetHandler implements Handler<ActionInput<typeof appointmentGet>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof appointmentGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const a = await visibleAppointment(tx, ctx.authz, i.appointment_id);
    const [c, s, st] = await Promise.all([
      tx.contact.findUnique({ where: { id: a.contactId }, select: { name: true } }),
      tx.product.findUnique({ where: { id: a.serviceId }, select: { name: true } }),
      tx.staff.findUnique({ where: { id: a.staffId }, select: { name: true } }),
    ]);
    return {
      result: {
        id: a.id,
        code: a.code,
        contact_id: a.contactId,
        contact: c?.name ?? '',
        service_id: a.serviceId,
        service: s?.name ?? '',
        staff_id: a.staffId,
        staff: st?.name ?? '',
        start_at: a.startAt.toISOString(),
        end_at: a.endAt.toISOString(),
        status: a.status,
        note: a.note,
        version: a.version,
      },
    };
  }
}
