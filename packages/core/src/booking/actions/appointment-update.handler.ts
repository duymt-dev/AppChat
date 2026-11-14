// appointment.update (TIP-023b SPEC C, booking.manage, risk write): sửa giờ / dịch vụ / nhân sự / ghi chú / nhắc / tuỳ biến của lịch còn mở.
// Khoá dòng + if_version; slot kiểm như lúc đặt, EXCLUDE ở DB chốt khi hai người cùng sửa (một transaction thắng, bên kia CONFLICT). Dời giờ /
// nhân sự → +1 lần dời, nhắc lại từ đầu, event appointment.rescheduled; chỉ ghi chú / tuỳ biến thì không. Undo 24 giờ khi lịch còn mở và chưa
// bị sửa tiếp (version khớp) — nhắc đã gửi khách không thu hồi được nên không hứa hoàn tác hậu quả ngoài hệ thống.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, appointmentUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers, actorUserId, checkOpportunityLink } from '../../crm/public';
import { BookingPlace } from '../services/booking-place';
import { lockAppointment } from '../booking-access';
import { eventOf, guarded, timeline } from '../services/appointment-write';
import { planEdit, snapshotOf, type Snapshot } from '../services/appointment-edit';
import { updatePreview } from './previews/appointment-book.handlers.preview';

type In = ActionInput<typeof appointmentUpdate>;
type Out = { appointment_id: string; status: string; version: number };

@Injectable()
@ActionHandler('appointment.update')
export class AppointmentUpdateHandler implements Handler<In, Out> {
  constructor(
    @Inject(BookingPlace) private readonly place: BookingPlace,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async role(ctx: ActionContext) {
    return ctx.authz.isOwner ? 'owner' : this.members.roleOf(ctx.workspaceId, actorUserId(ctx));
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    // TIP-033b §2.1: đổi dịch vụ có thể gắn gói khác của khách → khoá mọi liệu trình còn hiệu lực; đổi nhân sự → khoá cả nhân sự đích.
    const a = await lockAppointment(tx, ctx.authz, input.appointment_id, { staffIds: input.patch.staff_id ? [input.patch.staff_id] : [], contactPackages: input.patch.service_id !== undefined });
    const { timeZone } = await this.place.of(ctx.workspaceId);
    const plan = await planEdit(tx, a, input.patch, { timeZone, now, role: await this.role(ctx), ifVersion: input.if_version });
    // TIP-026c: đổi / bỏ "Thuộc cơ hội" (null = bỏ gắn) — kiểm như lúc đặt.
    const opp = input.patch.opportunity_id === undefined ? {} : { opportunityId: await checkOpportunityLink(tx, ctx.authz, a.contactId, input.patch.opportunity_id) };
    const row = await guarded(() =>
      tx.appointment.update({
        where: { id: a.id },
        data: {
          serviceId: plan.svc.id,
          staffId: plan.staffId,
          startAt: plan.startAt,
          endAt: plan.endAt,
          blockEndAt: plan.blockEndAt,
          holdExpiresAt: plan.hold(now),
          packageId: plan.packageId,
          note: plan.note,
          reminderMin: plan.reminderMin,
          custom: plan.custom as object,
          ...opp,
          ...(plan.moved ? { rescheduleCount: { increment: 1 }, remindersSent: [] } : {}),
          version: { increment: 1 },
          updatedAt: now,
        },
      }),
    );
    const actor = { type: ctx.actor.type, id: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx) };
    if (plan.moved) await timeline(tx, row, 'appointment_rescheduled', { at: `${plan.date} ${plan.start}` }, actor, now);
    return {
      result: { appointment_id: row.id, status: row.status, version: row.version },
      before: { ...snapshotOf(a), opportunity_id: a.opportunityId, version: row.version },
      events: plan.moved ? [{ topic: 'appointment.rescheduled', payload: eventOf(row, timeZone) }] : [],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Snapshot & { version: number; opportunity_id?: string | null };
    await lockAppointment(tx, ctx.authz, b.id, { staffIds: [b.staff_id], contactPackages: true });
    const a = await tx.appointment.findUnique({ where: { id: b.id } });
    if (!a || a.deletedAt || a.version !== b.version || (a.status !== 'pending' && a.status !== 'confirmed')) throw new AppError('CONFLICT', 409, { appointment_id: 'changed' });
    await guarded(() =>
      tx.appointment.update({
        where: { id: b.id },
        data: {
          serviceId: b.service_id,
          staffId: b.staff_id,
          startAt: new Date(b.start_at),
          endAt: new Date(b.end_at),
          blockEndAt: new Date(b.block_end_at),
          holdExpiresAt: b.hold ? new Date(b.hold) : null,
          remindersSent: b.reminders as object[],
          rescheduleCount: b.reschedule_count,
          packageId: b.package_id,
          note: b.note,
          reminderMin: b.reminder_min,
          custom: b.custom as object,
          // Biên nhận cũ (trước TIP-026c) không có ô này → giữ nguyên liên kết hiện tại.
          ...(b.opportunity_id !== undefined ? { opportunityId: b.opportunity_id } : {}),
          version: { increment: 1 },
          updatedAt: this.clock.now(),
        },
      }),
    );
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return updatePreview(ctx, tx, input, { now: this.clock.now(), timeZone: (await this.place.of(ctx.workspaceId)).timeZone, role: await this.role(ctx) });
  }
}
