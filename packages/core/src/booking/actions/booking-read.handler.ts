// booking.settings_get (TIP-033b §1.3): Trợ lý đọc cấu hình lịch hẹn trước khi đề xuất sửa — cùng reader với GET /settings/booking
// (operations/settings-read.ts). Quyền booking.config ở Executor; không trả khách / lịch.
import { Injectable } from '@nestjs/common';
import type { ActionInput, bookingSettingsGet } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { readBookingSettings } from '../operations/settings-read';

type Out = Awaited<ReturnType<typeof readBookingSettings>>;

@Injectable()
@ActionHandler('booking.settings_get')
export class BookingSettingsGetHandler implements Handler<ActionInput<typeof bookingSettingsGet>, Out> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof bookingSettingsGet>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return { result: await readBookingSettings(tx, { cursor: i.staff_cursor, limit: i.staff_limit }) };
  }
}
