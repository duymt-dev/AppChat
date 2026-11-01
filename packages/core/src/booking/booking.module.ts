// Domain `booking` (TIP-033): nhân sự, giờ mở cửa, lịch hẹn, tìm slot — 13 handler (appointment.* + staff.* + business_hours.update),
// đọc /v1/calendar* + /settings/booking (CalendarReadService), job giữ chỗ hết hạn / nhắc hẹn (jobs/booking.jobs.module.ts).
import { Module } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { CrmModule } from '../crm/crm.module';
import { AppointmentCreateHandler, AppointmentFindSlotsHandler, AppointmentListHandler, AppointmentRescheduleHandler } from './actions/appointment-book.handlers';
import { AppointmentCancelHandler, AppointmentCheckInHandler, AppointmentCompleteHandler, AppointmentConfirmHandler, AppointmentNoShowHandler } from './actions/appointment-flow.handlers';
import { BusinessHoursUpdateHandler, StaffCreateHandler, StaffDeactivateHandler, StaffUpdateHandler } from './actions/booking-config.handlers';
import { BookingPlace } from './services/booking-place';
import { CalendarReadService } from './services/calendar-read.service';

const HANDLERS = [
  AppointmentFindSlotsHandler, AppointmentListHandler, AppointmentCreateHandler, AppointmentRescheduleHandler,
  AppointmentConfirmHandler, AppointmentCheckInHandler, AppointmentCompleteHandler, AppointmentNoShowHandler, AppointmentCancelHandler,
  StaffCreateHandler, StaffUpdateHandler, StaffDeactivateHandler, BusinessHoursUpdateHandler,
];

@Module({
  imports: [CrmModule],
  providers: [
    ...HANDLERS,
    BookingPlace,
    {
      provide: CalendarReadService,
      inject: [{ token: TENANT_RESOLVER, optional: true }, BookingPlace, CLOCK],
      useFactory: (t: TenantDbResolver | undefined, p: BookingPlace, c: Clock) => (t ? new CalendarReadService(t, p, () => c.now()) : null),
    },
  ],
  exports: [BookingPlace, CalendarReadService],
})
export class BookingModule {}
