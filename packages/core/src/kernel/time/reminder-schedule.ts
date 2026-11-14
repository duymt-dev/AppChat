// Dời mốc nhắc ngoài giờ làm việc sang đầu giờ làm việc kế tiếp (standards/domain/money-time-numbering.md §2.5, §2.7).
// Dùng chung `addBusinessMinutes` của `@appchat/shared` (múi + lịch tuần workspace `working_hours` / `business_hours` → mặc định
// `DEFAULT_WORKING_DAYS`). Quy ước: báo giá (T-2), đề nghị thanh toán (T-1 / T+1 / T+7) và nhắc lịch hẹn 24h (`h24`) phải chờ vào giờ
// làm việc; CHỈ nhắc lịch hẹn 2h (`h2`) được miễn để không lỡ sát giờ hẹn. Chặn ngoài giờ ngay ở tầng quét để không đóng biên nhận `no_effect`.
import {
  DEFAULT_WORKING_DAYS,
  INVOICE_REMINDERS,
  addBusinessMinutes,
  dueReminder,
  utcToWall,
  wallToUtc,
  type BusinessCalendar,
  type WorkingDay,
} from '@appchat/shared';

export type ReminderCalendarInput = string | BusinessCalendar;
export type InvoiceReminderStep = (typeof INVOICE_REMINDERS)[number];
export type AppointmentReminderStep = NonNullable<ReturnType<typeof dueReminder>>;

const DAY_MS = 86_400_000;
const QUOTE_REMIND_DAYS = 2;

function workingDaysOf(settings: unknown): WorkingDay[] {
  const s = (settings && typeof settings === 'object' ? settings : {}) as Record<string, unknown>;
  const wh = s.working_hours as { days?: unknown } | undefined;
  if (Array.isArray(wh?.days) && wh.days.length > 0) return wh.days as WorkingDay[];
  const bh = s.business_hours;
  if (Array.isArray(bh) && bh.length > 0) return bh as WorkingDay[];
  if (bh && typeof bh === 'object' && Array.isArray((bh as { days?: unknown }).days) && (bh as { days: unknown[] }).days.length > 0) {
    return (bh as { days: WorkingDay[] }).days;
  }
  return DEFAULT_WORKING_DAYS.map((d) => ({ ...d }));
}

function shiftWallDate(date: string, deltaDays: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + deltaDays * DAY_MS).toISOString().slice(0, 10);
}

/** Lịch giờ làm việc để dời mốc nhắc của workspace (`enabled: true` — kể cả khi workspace tắt tạm dừng SLA riêng). */
export function reminderCalendarOf(w?: { timezone?: string | null; settings?: unknown } | null): BusinessCalendar {
  return {
    days: workingDaysOf(w?.settings),
    timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh',
    enabled: true,
  };
}

/** Chuẩn hoá đầu vào: `BusinessCalendar` áp dời giờ làm việc; chuỗi múi giờ (gọi trực tiếp legacy) giữ hành vi không dời. */
export function toReminderCalendar(input?: ReminderCalendarInput): BusinessCalendar {
  if (input && typeof input === 'object') return input;
  return {
    days: DEFAULT_WORKING_DAYS.map((d) => ({ ...d })),
    timeZone: input ?? 'Asia/Ho_Chi_Minh',
    enabled: false,
  };
}

/** Thời điểm làm việc hợp lệ gần nhất >= `at` theo lịch workspace (nằm trong giờ làm việc thì giữ nguyên `at`). */
export const nextBusinessMoment = (at: Date, cal: BusinessCalendar): Date => addBusinessMinutes(at, 0, cal);

/** `at` có đang nằm trong khung giờ làm việc `[from, to)` theo lịch `cal` hay không. */
export const isBusinessMoment = (at: Date, cal: BusinessCalendar): boolean => nextBusinessMoment(at, cal).getTime() <= at.getTime();

/** Thời điểm gửi dự kiến cho nhắc báo giá `T-2`: `00:00` ngày `(validUntil - 2 ngày)` dời tới đầu giờ làm việc. */
export function quoteRemindScheduledAt(validUntil: Date, cal: BusinessCalendar, remindDays = QUOTE_REMIND_DAYS): Date {
  const validDate = utcToWall(validUntil, cal.timeZone).date;
  const raw = wallToUtc(shiftWallDate(validDate, -remindDays), '00:00', cal.timeZone);
  return nextBusinessMoment(raw, cal);
}

export function isQuoteRemindDue(validUntil: Date, now: Date, cal: BusinessCalendar, remindDays = QUOTE_REMIND_DAYS): boolean {
  if (validUntil < now) return false;
  if (!isBusinessMoment(now, cal)) return false;
  return now.getTime() >= quoteRemindScheduledAt(validUntil, cal, remindDays).getTime();
}

/** Thời điểm gửi dự kiến cho mốc công nợ (`offsetDays` ∈ {-1, +1, +7} quanh `dueDate` `@db.Date`): dời tới giờ làm việc. */
export function invoiceRemindScheduledAt(dueDate: Date, offsetDays: number, cal: BusinessCalendar): Date {
  const dueDateStr = dueDate.toISOString().slice(0, 10);
  const raw = wallToUtc(shiftWallDate(dueDateStr, offsetDays), '00:00', cal.timeZone);
  return nextBusinessMoment(raw, cal);
}

/** Mốc nhắc công nợ gần nhất đã đến hạn và đang trong giờ làm việc (ngoài giờ → null để hoãn tới lượt quét giờ làm việc). */
export function dueInvoiceReminder(dueDate: Date, now: Date, cal: BusinessCalendar): InvoiceReminderStep | null {
  if (!isBusinessMoment(now, cal)) return null;
  for (const step of [...INVOICE_REMINDERS].reverse()) {
    if (now.getTime() >= invoiceRemindScheduledAt(dueDate, step.offset, cal).getTime()) return step;
  }
  return null;
}

/** Thời điểm gửi dự kiến cho nhắc lịch hẹn: `h24` dời theo giờ làm việc; `h2` MIỄN (gửi sát giờ hẹn bất kể khung giờ). */
export function appointmentRemindScheduledAt(startAt: Date, step: AppointmentReminderStep, cal: BusinessCalendar): Date {
  const raw = new Date(startAt.getTime() - step.before * 60_000);
  return step.key === 'h2' ? raw : nextBusinessMoment(raw, cal);
}

/** Mốc nhắc lịch hẹn đến hạn: `h2` gửi ngay dù ngoài giờ; `h24` chỉ gửi trong giờ làm việc từ mốc đã dời. */
export function dueAppointmentReminder(
  startAt: Date,
  now: Date,
  sentKeys: readonly string[],
  cal: BusinessCalendar,
): AppointmentReminderStep | null {
  const step = dueReminder(startAt, now, sentKeys);
  if (!step) return null;
  if (step.key === 'h2') return step;
  if (!isBusinessMoment(now, cal)) return null;
  return now.getTime() >= appointmentRemindScheduledAt(startAt, step, cal).getTime() ? step : null;
}
