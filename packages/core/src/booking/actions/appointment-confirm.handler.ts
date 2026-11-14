// appointment.confirm (REQ-G02, TIP-033b §1.1 / §2): xác nhận lịch chờ hoặc xác nhận lại lịch hết giữ chỗ đúng khung cũ (operations/confirm.ts),
// if_version tuỳ chọn, trả version mới. Hoàn tác 24 giờ có điều kiện (operations/undo.ts). Một handler duy nhất cho action này.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, appointmentConfirm } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { BookingPlace } from '../services/booking-place';
import { eventOf } from '../services/appointment-write';
import { confirmAppointment } from '../operations/confirm';
import { undoConfirm, type ConfirmSnap } from '../operations/undo';
import { confirmPreview } from './previews/appointment-flow.handlers.preview';

type Out = { appointment_id: string; status: string; version: number };

@Injectable()
@ActionHandler('appointment.confirm')
export class AppointmentConfirmHandler implements Handler<ActionInput<typeof appointmentConfirm>, Out> {
  constructor(
    @Inject(BookingPlace) private readonly place: BookingPlace,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentConfirm>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const { timeZone } = await this.place.of(ctx.workspaceId);
    const { before, row, prior } = await confirmAppointment(ctx, tx, input.appointment_id, input.if_version, now, timeZone);
    const snap: ConfirmSnap = { id: before.id, prior, status: before.status, hold: before.holdExpiresAt?.toISOString() ?? null, after_version: row.version };
    return {
      result: { appointment_id: row.id, status: row.status, version: row.version },
      before: snap,
      events: [{ topic: 'appointment.confirmed', payload: { ...eventOf(row, timeZone), reconfirmed: prior === 'expired' } }],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await undoConfirm(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof appointmentConfirm>, tx: TenantTx) {
    return confirmPreview(ctx, tx, input, (await this.place.of(ctx.workspaceId)).timeZone, this.clock.now());
  }
}
