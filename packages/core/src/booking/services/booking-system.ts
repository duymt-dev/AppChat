// Việc hệ thống của lịch hẹn (REQ-G02 / G04, Blueprint §1.4 scheduler): facade mỏng — TIP-003c chuyển thân transaction sang action
// riêng `appointment.system_transition` (booking/system/*): lịch chờ hết giữ chỗ → `expired`; nhắc 24 giờ / 2 giờ trước giờ hẹn qua kênh
// khách đã dùng, mỗi mốc một lần (biên nhận trigger + `reminders_sent`). Tin nhắc là outgoing bền, người gửi hệ thống (không mượn Owner).
import type { TenantDb } from '@appchat/db';
import type { SystemRunDeps } from '../../kernel/actions/system';
import type { ReminderCalendarInput } from '../../kernel/time/reminder-schedule';
import { expireHoldsDue, remindAppointmentsDue } from '../system/dispatch';

/** Lịch chờ quá hạn giữ chỗ → expired. Trả số lịch đã chuyển. */
export const expireHolds = (db: TenantDb, ws: string, now: Date, d: SystemRunDeps) => expireHoldsDue(db, ws, now, d);

/** Nhắc hẹn 24 giờ (dời ngoài giờ theo lịch workspace khi truyền BusinessCalendar) / 2 giờ trước (miễn dời). Trả số tin đã xếp gửi. */
export const remindAppointments = (db: TenantDb, ws: string, now: Date, d: SystemRunDeps, cal?: ReminderCalendarInput) => remindAppointmentsDue(db, ws, now, d, cal);
