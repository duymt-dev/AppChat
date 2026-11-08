// Domain `booking` (TIP-033): nhân sự, giờ mở cửa, lịch hẹn, tìm slot — appointment.* (kể cả update — TIP-023b) + staff.* + business_hours.update,
// đọc /v1/calendar* + /settings/booking (CalendarReadService), job giữ chỗ hết hạn / nhắc hẹn (jobs/booking.jobs.module.ts).
import { Module, type OnModuleInit } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { CrmModule } from '../crm/crm.module';
import { registerOwnershipPort } from '../kernel/ownership/registry';
import { appointmentOwnershipPort } from './services/ownership-port';
import { AppointmentCreateHandler, AppointmentFindSlotsHandler, AppointmentListHandler, AppointmentRescheduleHandler } from './actions/appointment-book.handlers';
import { AppointmentCancelHandler, AppointmentCheckInHandler, AppointmentCompleteHandler, AppointmentConfirmHandler, AppointmentNoShowHandler } from './actions/appointment-flow.handlers';
import { BusinessHoursUpdateHandler, StaffCreateHandler, StaffDeactivateHandler, StaffUpdateHandler } from './actions/booking-config.handlers';
import { BookingPlace } from './services/booking-place';
import { CalendarReadService } from './services/calendar-read.service';

import { AppointmentGetHandler } from './actions/booking-read.handlers';
import { ServiceSearchHandler, StaffSearchHandler } from './actions/booking-reference-read.handlers';
import { AppointmentUpdateHandler } from './actions/appointment-update.handler';

const HANDLERS = [
  AppointmentFindSlotsHandler, AppointmentListHandler, AppointmentCreateHandler, AppointmentRescheduleHandler,
  AppointmentConfirmHandler, AppointmentCheckInHandler, AppointmentCompleteHandler, AppointmentNoShowHandler, AppointmentCancelHandler,
  StaffCreateHandler, StaffUpdateHandler, StaffDeactivateHandler, BusinessHoursUpdateHandler,
  AppointmentGetHandler, StaffSearchHandler, ServiceSearchHandler, AppointmentUpdateHandler,
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
export class BookingModule implements OnModuleInit {
  /** Port chuyển phụ trách lịch hẹn (TIP-015d) — CRM gọi trong transaction chuyển khách, không import Booking. */
  onModuleInit(): void {
    registerOwnershipPort(appointmentOwnershipPort);
  }
}
