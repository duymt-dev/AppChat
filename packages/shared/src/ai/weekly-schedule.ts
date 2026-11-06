// Lịch hoạt động theo tuần (TIP-022b A): múi IANA + 7 ngày (0 = Thứ Hai) × tối đa 4 khoảng nửa mở [from, to) "HH:mm". Qua đêm phải tách
// tường minh thành hai ngày (22:00–24:00 + 00:00–06:00) — không có from ≥ to mơ hồ. Đánh giá theo THỜI ĐIỂM (Clock tiêm vào) đổi sang giờ
// tường của múi bằng Intl (đúng cả giờ mùa hè: khoảng trống DST không có thời điểm nào rơi vào, giờ lặp lại tính theo giờ tường). Dùng
// chung FE editor + server validate + runtime agent / tài khoản kênh.
import { utcToWall } from '../time/wall-clock';

export const SCHEDULE_DAYS = 7;
export const MAX_INTERVALS_PER_DAY = 4;
/** `24:00` chỉ được làm mốc kết thúc (hết ngày). */
const HM = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export interface ScheduleInterval {
  from: string;
  to: string;
}

export interface WeeklySchedule {
  timezone: string;
  /** Đúng 7 phần tử, 0 = Thứ Hai … 6 = Chủ nhật; ngày rỗng = nghỉ. */
  days: ScheduleInterval[][];
}

export type ScheduleError = 'timezone' | 'days' | 'format' | 'order' | 'overlap' | 'too_many';

const minutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const hmOf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function validTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Lỗi đầu tiên theo đường dẫn (`days.2.1` …) — rỗng = hợp lệ. Không tự sửa khoảng lệch. */
export function validateSchedule(s: WeeklySchedule): Record<string, ScheduleError> {
  if (!validTimezone(s.timezone)) return { timezone: 'timezone' };
  if (!Array.isArray(s.days) || s.days.length !== SCHEDULE_DAYS) return { days: 'days' };
  for (let d = 0; d < SCHEDULE_DAYS; d++) {
    const day = s.days[d]!;
    if (day.length > MAX_INTERVALS_PER_DAY) return { [`days.${d}`]: 'too_many' };
    let end = -1;
    for (let i = 0; i < day.length; i++) {
      const { from, to } = day[i]!;
      if (!HM.test(from) || from === '24:00' || !HM.test(to)) return { [`days.${d}.${i}`]: 'format' };
      if (minutes(from) >= minutes(to)) return { [`days.${d}.${i}`]: 'order' };
      if (minutes(from) < end) return { [`days.${d}.${i}`]: 'overlap' };
      end = minutes(to);
    }
  }
  return {};
}

/** Chuẩn hoá: sắp theo giờ bắt đầu (editor có thể thêm lộn thứ tự) rồi validate. */
export function canonicalSchedule(s: WeeklySchedule): { schedule: WeeklySchedule; errors: Record<string, ScheduleError> } {
  const schedule = { timezone: s.timezone, days: (s.days ?? []).map((d) => [...d].sort((a, b) => a.from.localeCompare(b.from))) };
  return { schedule, errors: validateSchedule(schedule) };
}

/**
 * Tách khoảng qua đêm do người nhập (from > to) thành hai ngày liên tiếp — chỉ editor gọi khi người dùng xác nhận, server không tự đoán.
 */
export function splitOvernight(days: ScheduleInterval[][], day: number, from: string, to: string): ScheduleInterval[][] {
  const out = days.map((d) => [...d]);
  if (minutes(from) < minutes(to)) {
    out[day]!.push({ from, to });
    return out;
  }
  out[day]!.push({ from, to: '24:00' });
  if (minutes(to) > 0) out[(day + 1) % SCHEDULE_DAYS]!.push({ from: '00:00', to });
  return out;
}

/** Thời điểm `at` nằm trong lịch? (giờ tường của múi lịch tại chính thời điểm đó). */
export function inSchedule(s: WeeklySchedule, at: Date): boolean {
  const w = utcToWall(at, s.timezone);
  const m = minutes(w.hm);
  return (s.days[w.weekday] ?? []).some((iv) => m >= minutes(iv.from) && m < minutes(iv.to));
}

/** Mốc mở kế tiếp (ngày + giờ tường) trong 7 ngày tới — hiển thị "hoạt động lại lúc …"; null = lịch rỗng. */
export function nextOpening(s: WeeklySchedule, at: Date): { weekday: number; at: string } | null {
  const w = utcToWall(at, s.timezone);
  const now = minutes(w.hm);
  for (let k = 0; k <= SCHEDULE_DAYS; k++) {
    const d = (w.weekday + k) % SCHEDULE_DAYS;
    const iv = (s.days[d] ?? []).find((x) => k > 0 || minutes(x.from) > now);
    if (iv) return { weekday: d, at: iv.from };
  }
  return null;
}

/** Giờ hành chính cũ (DC-136): 08:00–17:30 Asia/Ho_Chi_Minh mọi ngày — giữ cho cấu hình `office` đã xuất bản. */
export const OFFICE_SCHEDULE: WeeklySchedule = {
  timezone: 'Asia/Ho_Chi_Minh',
  days: Array.from({ length: SCHEDULE_DAYS }, () => [{ from: '08:00', to: '17:30' }]),
};

export const emptySchedule = (timezone = 'Asia/Ho_Chi_Minh'): WeeklySchedule => ({ timezone, days: Array.from({ length: SCHEDULE_DAYS }, () => []) });

export { hmOf as scheduleHm };
