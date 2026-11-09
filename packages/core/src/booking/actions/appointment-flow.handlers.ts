// appointment.check_in · complete · mark_no_show · cancel (REQ-G02, COMMERCE §6 / 8b; APPOINTMENT_FLOW). Xác nhận / xác nhận lại:
// appointment-confirm.handler.ts (TIP-033b) — re-export dưới đây giữ đường import cũ. Hoàn thành: thuộc liệu
// trình → trừ 1 buổi (`package_usage`), ngoài liệu trình → chỉ GỢI Ý tạo đơn (`suggest_order`, không tự tạo) — không cộng điểm. Không
// đến: chỉ sau ân hạn 20 phút từ giờ hẹn; mặc định không trừ buổi (cấu hình `no_show_deducts`). Huỷ: lý do bắt buộc. Hoàn tác 24 giờ
// có điều kiện (operations/undo.ts undoFlow — version sau-ghi, trả buổi của chính lịch, giữ chỗ lại phải còn hạn / còn khung / gói còn chỗ).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, noShowAllowed } from '@appchat/shared';
import type { ActionInput, appointmentCancel, appointmentCheckIn, appointmentComplete, appointmentMarkNoShow } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { actorUserId } from '../../crm/public';
import { BookingPlace } from '../services/booking-place';
import { bookingSetting } from '../services/slots';
import { lockAppointment, type AppointmentRecord } from '../booking-access';
import { eventOf, revertSession, step, timeline, useSession } from '../services/appointment-write';
import { undoFlow, type FlowSnap } from '../operations/undo';
import { cancelPreview, checkInPreview, completePreview, noShowPreview } from './previews/appointment-flow.handlers.preview';
export { AppointmentConfirmHandler } from './appointment-confirm.handler';

type Out = { appointment_id: string; status: string };
const actorOf = (ctx: ActionContext) => ({ type: ctx.actor.type, id: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx) });
const snap = (a: AppointmentRecord, after: AppointmentRecord): FlowSnap => ({ id: a.id, status: a.status, hold: a.holdExpiresAt?.toISOString() ?? null, confirmed_at: a.confirmedAt?.toISOString() ?? null, checked_in_at: a.checkedInAt?.toISOString() ?? null, done_at: a.doneAt?.toISOString() ?? null, after_version: after.version });
const noRevert = async () => undefined;

abstract class FlowBase {
  constructor(
    protected readonly place: BookingPlace,
    protected readonly clock: Clock,
  ) {}

  protected async move(ctx: ActionContext, tx: TenantTx, id: string, action: string, data: (a: AppointmentRecord, now: Date) => Record<string, unknown>) {
    const now = this.clock.now();
    const a = await lockAppointment(tx, ctx.authz, id);
    const to = step(a, action);
    const row = await tx.appointment.update({ where: { id: a.id }, data: { status: to, version: { increment: 1 }, updatedAt: now, ...data(a, now) } });
    const { timeZone } = await this.place.of(ctx.workspaceId);
    return { before: a, row, now, timeZone };
  }
}

@Injectable()
@ActionHandler('appointment.check_in')
export class AppointmentCheckInHandler extends FlowBase implements Handler<ActionInput<typeof appointmentCheckIn>, Out> {
  constructor(@Inject(BookingPlace) place: BookingPlace, @Inject(CLOCK) clock: Clock) {
    super(place, clock);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentCheckIn>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { before, row, timeZone } = await this.move(ctx, tx, input.appointment_id, 'appointment.check_in', (a, now) => ({ holdExpiresAt: null, checkedInAt: now, confirmedAt: a.confirmedAt ?? now }));
    return { result: { appointment_id: row.id, status: row.status }, before: snap(before, row), events: [{ topic: 'appointment.checked_in', payload: eventOf(row, timeZone) }] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await undoFlow(ctx, log, tx, 'in_progress', this.clock.now(), noRevert);
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof appointmentCheckIn>, tx: TenantTx) {
    return checkInPreview(ctx, tx, input, (await this.place.of(ctx.workspaceId)).timeZone);
  }
}

@Injectable()
@ActionHandler('appointment.complete')
export class AppointmentCompleteHandler extends FlowBase implements Handler<ActionInput<typeof appointmentComplete>, Out & { package: { id: string; used: number; total: number } | null; suggest_order: boolean }> {
  constructor(@Inject(BookingPlace) place: BookingPlace, @Inject(CLOCK) clock: Clock) {
    super(place, clock);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentComplete>, tx: TenantTx) {
    const { before, row, now, timeZone } = await this.move(ctx, tx, input.appointment_id, 'appointment.complete', (a, t) => ({ doneAt: t, checkedInAt: a.checkedInAt ?? t, holdExpiresAt: null }));
    const pkg = await useSession(tx, row, now);
    const svc = await tx.product.findUnique({ where: { id: row.serviceId }, select: { name: true } });
    const actor = actorOf(ctx);
    await timeline(tx, row, 'appointment_done', { service: svc?.name ?? '' }, actor, now);
    if (pkg) await timeline(tx, row, 'package_session_used', { name: pkg.name, used: pkg.used, total: pkg.total }, actor, now);
    return {
      result: { appointment_id: row.id, status: row.status, package: pkg ? { id: pkg.id, used: pkg.used, total: pkg.total } : null, suggest_order: !pkg && !row.orderId },
      before: snap(before, row),
      events: [
        { topic: 'appointment.completed', payload: { ...eventOf(row, timeZone), session_used: !!pkg } },
        ...(pkg ? [{ topic: 'package.changed', payload: { package_id: pkg.id, contact_id: row.contactId } }] : []),
      ],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const now = this.clock.now();
    await undoFlow(ctx, log, tx, 'done', now, (a) => revertSession(tx, a, now));
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof appointmentComplete>, tx: TenantTx) {
    return completePreview(ctx, tx, input, (await this.place.of(ctx.workspaceId)).timeZone);
  }
}

@Injectable()
@ActionHandler('appointment.mark_no_show')
export class AppointmentNoShowHandler extends FlowBase implements Handler<ActionInput<typeof appointmentMarkNoShow>, Out> {
  constructor(@Inject(BookingPlace) place: BookingPlace, @Inject(CLOCK) clock: Clock) {
    super(place, clock);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentMarkNoShow>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const cur = await lockAppointment(tx, ctx.authz, input.appointment_id);
    if (!noShowAllowed(cur.startAt, this.clock.now())) throw new AppError('INVALID_STATE', 409, { start_at: 'grace_period' });
    const { before, row, now, timeZone } = await this.move(ctx, tx, input.appointment_id, 'appointment.mark_no_show', () => ({ holdExpiresAt: null }));
    if ((await bookingSetting(tx)).noShowDeducts) await useSession(tx, row, now);
    await timeline(tx, row, 'appointment_no_show', {}, actorOf(ctx), now);
    return { result: { appointment_id: row.id, status: row.status }, before: snap(before, row), events: [{ topic: 'appointment.no_show', payload: eventOf(row, timeZone) }] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const now = this.clock.now();
    await undoFlow(ctx, log, tx, 'no_show', now, (a) => revertSession(tx, a, now));
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof appointmentMarkNoShow>, tx: TenantTx) {
    return noShowPreview(ctx, tx, input, this.clock.now(), (await this.place.of(ctx.workspaceId)).timeZone);
  }
}

@Injectable()
@ActionHandler('appointment.cancel')
export class AppointmentCancelHandler extends FlowBase implements Handler<ActionInput<typeof appointmentCancel>, Out> {
  constructor(@Inject(BookingPlace) place: BookingPlace, @Inject(CLOCK) clock: Clock) {
    super(place, clock);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentCancel>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const reason = input.reason.trim();
    const { before, row, now, timeZone } = await this.move(ctx, tx, input.appointment_id, 'appointment.cancel', () => ({ cancelReason: reason, holdExpiresAt: null }));
    await timeline(tx, row, 'appointment_cancelled', { reason: reason.slice(0, 200) }, actorOf(ctx), now);
    return { result: { appointment_id: row.id, status: row.status }, before: snap(before, row), events: [{ topic: 'appointment.cancelled', payload: { ...eventOf(row, timeZone), reason } }] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await undoFlow(ctx, log, tx, 'cancelled', this.clock.now(), noRevert);
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof appointmentCancel>, tx: TenantTx) {
    return cancelPreview(ctx, tx, input, (await this.place.of(ctx.workspaceId)).timeZone);
  }
}
