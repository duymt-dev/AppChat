// Lịch hoạt động của agent theo phiên bản (TIP-022b A). `working_hours` giữ nguyên enum: `always` luôn chạy; `office` = 08:00–17:30
// Asia/Ho_Chi_Minh mọi ngày (DC-136, cấu hình đã xuất bản không đổi nghĩa); `custom` dùng `weekly_schedule` có cấu trúc. `custom` cũ chưa
// có lịch = `needs_configuration`: hành vi đã xuất bản giữ nguyên (luôn chạy — đúng như trước) + cảnh báo, nhưng KHÔNG cho xuất bản mới
// tới khi người vận hành lưu lịch có cấu trúc. Không tự nới / thu hẹp giờ.
import { AppError, OFFICE_SCHEDULE, canonicalSchedule, type WeeklySchedule } from '@appchat/shared';

/** Phần cấu hình agent liên quan giờ (cấu trúc — không import agent.store để tránh vòng). */
export interface HoursConfig {
  working_hours: 'always' | 'office' | 'custom';
  weekly_schedule: WeeklySchedule | null;
}

export type ScheduleState = 'ok' | 'needs_configuration';

/** Lịch hiệu lực của cấu hình; null = không giới hạn giờ (always / custom cũ chưa cấu hình — giữ hành vi đã xuất bản). */
export function agentSchedule(c: HoursConfig): WeeklySchedule | null {
  if (c.working_hours === 'office') return OFFICE_SCHEDULE;
  if (c.working_hours === 'custom') return c.weekly_schedule ?? null;
  return null;
}

export const scheduleState = (c: HoursConfig): ScheduleState =>
  c.working_hours === 'custom' && !c.weekly_schedule ? 'needs_configuration' : 'ok';

/** Lịch đọc từ jsonb: hỏng / không hợp lệ → null (không đoán lại từ dữ liệu cũ). */
export function scheduleOf(v: unknown): WeeklySchedule | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as WeeklySchedule;
  if (typeof s.timezone !== 'string' || !Array.isArray(s.days)) return null;
  const { schedule, errors } = canonicalSchedule(s);
  return Object.keys(errors).length ? null : schedule;
}

/** Ghi: lịch phải hợp lệ (đã chuẩn hoá thứ tự); trả bản chuẩn. */
export function assertSchedule(v: WeeklySchedule | null | undefined): WeeklySchedule | null {
  if (!v) return null;
  const { schedule, errors } = canonicalSchedule(v);
  const [path, code] = Object.entries(errors)[0] ?? [];
  if (path) throw new AppError('VALIDATION_FAILED', 422, { [`weekly_schedule.${path}`]: code! });
  return schedule;
}

/** Xuất bản mới chế độ `custom` cần lịch có cấu trúc (quay lại phiên bản cũ không qua đây — giữ đúng hành vi cũ). */
export function assertPublishable(c: HoursConfig): void {
  if (scheduleState(c) === 'needs_configuration') throw new AppError('VALIDATION_FAILED', 422, { weekly_schedule: 'needs_configuration' });
}
