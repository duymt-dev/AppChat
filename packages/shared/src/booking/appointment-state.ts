// Trạng thái lịch hẹn (REQ-G02, Blueprint §2.2 appointment, COMMERCE §6 / 8b): bảng chuyển dùng chung BE + mock FE + nút drawer + Trợ lý.
// Chờ xác nhận (giữ chỗ 2 giờ — hết giữ chỗ → expired, xác nhận lại được nếu khung + gói còn hợp lệ — TIP-033b) → Đã xác nhận → Đã đến → Hoàn thành; Không đến chỉ sau ân hạn 20 phút từ giờ hẹn;
// Huỷ bắt buộc lý do; đổi giờ giữ cùng mã (reschedule_count + 1). Lịch còn chiếm chỗ nhân sự: pending / confirmed / in_progress.
import { defineFlow } from '../state/flow';

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'in_progress', 'done', 'no_show', 'cancelled', 'expired'] as const;
export type AppointmentStatusKey = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_SOURCES = ['staff', 'agent', 'assistant', 'widget', 'zalo_personal', 'webchat', 'email'] as const;

/** Trạng thái còn chiếm khung giờ của nhân sự (ràng buộc EXCLUDE). */
export const APPOINTMENT_HOLDING: readonly AppointmentStatusKey[] = ['pending', 'confirmed', 'in_progress'];
/** Giữ chỗ của lịch chờ xác nhận (giờ — REQ-G02). */
export const APPOINTMENT_HOLD_HOURS = 2;
/** Ân hạn trước khi được đánh dấu Không đến (phút — REQ-G02). */
export const NO_SHOW_GRACE_MIN = 20;
/** Nhắc hẹn trước giờ hẹn (phút — REQ-G04: 24 giờ và 2 giờ). */
export const APPOINTMENT_REMINDERS = [
  { key: 'h24', before: 24 * 60 },
  { key: 'h2', before: 2 * 60 },
] as const;

export const APPOINTMENT_FLOW = defineFlow<AppointmentStatusKey>({
  pending: {
    'appointment.confirm': 'confirmed',
    'appointment.reschedule': 'pending',
    'appointment.check_in': 'in_progress',
    'appointment.cancel': 'cancelled',
    'appointment.mark_no_show': 'no_show',
    'appointment.expire': 'expired',
  },
  confirmed: {
    'appointment.reschedule': 'confirmed',
    'appointment.check_in': 'in_progress',
    'appointment.complete': 'done',
    'appointment.cancel': 'cancelled',
    'appointment.mark_no_show': 'no_show',
  },
  in_progress: { 'appointment.complete': 'done' },
  done: {},
  no_show: {},
  cancelled: {},
  // TIP-033b (D52d, state-machine §8): hết giữ chỗ không phải trạng thái cuối — xác nhận lại đúng khung cũ (kiểm lại chỗ / gói) hoặc huỷ.
  expired: { 'appointment.confirm': 'confirmed', 'appointment.cancel': 'cancelled' },
  terminal: ['done', 'no_show', 'cancelled'],
});

/** Hạn giữ chỗ: tạo + 2 giờ, nhưng không quá giờ hẹn. */
export const holdUntil = (createdAt: Date, startAt: Date): Date =>
  new Date(Math.min(createdAt.getTime() + APPOINTMENT_HOLD_HOURS * 3_600_000, startAt.getTime()));

/** Đã qua ân hạn để đánh dấu Không đến chưa. */
export const noShowAllowed = (startAt: Date, now: Date): boolean => now.getTime() >= startAt.getTime() + NO_SHOW_GRACE_MIN * 60_000;

/** Mốc nhắc gần nhất đã tới mà chưa gửi (lỡ lượt quét vẫn nhắc mốc đó, không dồn mốc xa hơn); null = chưa tới / đã gửi / đã qua giờ hẹn. */
export function dueReminder(startAt: Date, now: Date, sent: readonly string[]): (typeof APPOINTMENT_REMINDERS)[number] | null {
  const left = (startAt.getTime() - now.getTime()) / 60_000;
  if (left <= 0) return null;
  const step = [...APPOINTMENT_REMINDERS].reverse().find((r) => left <= r.before);
  return step && !sent.includes(step.key) ? step : null;
}
