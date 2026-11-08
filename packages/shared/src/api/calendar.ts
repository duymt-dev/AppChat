// Shape đọc Lịch hẹn (FE ↔ BE — gap-filling §5, TIP-033): GET /v1/calendar?from=&to=&staff_id=&status=&team=&q=&cf.* (khoảng ngày theo
// giờ workspace, không phân trang — lịch theo ngày / tuần / tháng), /calendar/meta (dịch vụ, nhân sự, giờ mở cửa, KPI hôm nay,
// follow-up), /calendar/:id, /calendar/slots?service_id=&date=&staff_id=&exclude_id=. Mock transport (apps/web) và API thật parse cùng schema.
import { z } from 'zod';
import { customValuesSchema } from '../custom-fields/values';
import { APPOINTMENT_STATUSES } from '../booking/appointment-state';

export const appointmentRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  contact_id: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  owner_user_id: z.string(),
  service_id: z.string(),
  staff_id: z.string(),
  /** ISO có offset giờ workspace (vd. 2026-06-24T09:00:00+07:00) — FE cắt chuỗi lấy ngày / giờ. */
  start_at: z.string(),
  end_at: z.string(),
  status: z.enum(APPOINTMENT_STATUSES),
  /** paid | partial | pending | free — theo đơn của buổi (8b); thuộc liệu trình thì FE hiện "Liệu trình". */
  pay: z.string(),
  source: z.string(),
  note: z.string(),
  cancel_reason: z.string(),
  reschedule_count: z.number().int(),
  package_id: z.string().nullable(),
  order_id: z.string().nullable(),
  package: z.object({ id: z.string(), name: z.string(), used: z.number().int(), total: z.number().int() }).nullable(),
  reminders: z.array(z.object({ kind: z.string(), at: z.string() })),
  custom: customValuesSchema.optional(),
  /** Phiên bản lịch (TIP-033b) — client mới gửi `if_version` khi xác nhận / xác nhận lại. */
  version: z.number().int().optional(),
});
export type AppointmentRow = z.infer<typeof appointmentRowSchema>;

export const appointmentsPageSchema = z.object({ data: z.array(appointmentRowSchema), next_cursor: z.null() });

export const bookingServiceSchema = z.object({ id: z.string(), name: z.string(), color: z.string(), duration: z.number().int(), price: z.string(), buffer: z.number().int() });
export const bookingStaffSchema = z.object({ id: z.string(), name: z.string(), role: z.string(), initial: z.string(), color: z.string(), team: z.string(), room: z.string() });

export const calendarMetaSchema = z.object({
  /** Hôm nay theo giờ workspace (YYYY-MM-DD). */
  today: z.string(),
  /** Khung giờ của lưới (mở sớm nhất / đóng muộn nhất trong tuần). */
  open_hours: z.object({ start: z.string(), end: z.string() }),
  services: z.array(bookingServiceSchema),
  staff: z.array(bookingStaffSchema),
  history: z.array(z.object({ at: z.string(), service: z.string() })),
  ai: z.array(z.tuple([z.string(), z.string(), z.string()])),
  follow_ups: z.array(z.object({ id: z.string(), at: z.string(), note: z.string(), contact_name: z.string(), step: z.string(), owner: z.string(), channel: z.string(), due: z.enum(['today', 'overdue']) })),
  stats: z.object({
    today: z.number().int(),
    confirmed: z.number().int(),
    arrived: z.number().int(),
    pending: z.number().int(),
    hours: z.string(),
    capacity: z.string(),
    revenue: z.string(),
    paid: z.number().int(),
  }),
});

export const slotsSchema = z.object({ slots: z.array(z.object({ start: z.string(), end: z.string(), staff_ids: z.array(z.string()) })) });

/** Cài đặt lịch hẹn (/settings/booking — `booking.config`). */
export const bookingSettingsSchema = z.object({
  days: z.array(z.object({ weekday: z.number().int(), open: z.boolean(), start: z.string(), end: z.string() })),
  slot_step_min: z.number().int(),
  default_buffer_min: z.number().int(),
  no_show_deducts: z.boolean(),
  staff: z.array(bookingStaffSchema.extend({ active: z.boolean(), skills: z.array(z.string()), user_id: z.string().nullable(), schedule: z.array(z.object({ weekday: z.number().int(), open: z.boolean(), start: z.string(), end: z.string() })) })),
});
