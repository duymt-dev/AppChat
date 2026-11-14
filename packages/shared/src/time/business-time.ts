// Giờ làm việc cho SLA người + mốc nhắc (standards/domain/money-time-numbering §2: "SLA người và mốc nhắc dùng chung một hàm
// businessTime"). Lịch tuần `WorkingDay` (0 = Thứ Hai) theo múi giờ workspace; ngày nghỉ / ngoài khung không tính. Lịch không có ngày
// làm nào (hoặc tắt "tạm dừng SLA ngoài giờ") → tính theo giờ tuyệt đối.
import type { WorkingDay } from '../support/sla-defaults';
import { utcToWall, wallToUtc, weekdayOf } from './wall-clock';

export interface BusinessCalendar {
  days: readonly WorkingDay[];
  timeZone: string;
  /** false = không dừng ngoài giờ (giờ tuyệt đối). */
  enabled: boolean;
}

const MIN = 60_000;
const DAY_MS = 86_400_000;
const nextDate = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const active = (c: BusinessCalendar) => c.enabled && c.days.some((d) => d.on && d.from < d.to);

/** Khung làm việc [start, end) của ngày tường `date` (null = nghỉ). */
function windowOf(c: BusinessCalendar, date: string): [number, number] | null {
  const d = c.days.find((x) => x.day === weekdayOf(date));
  if (!d?.on || d.from >= d.to) return null;
  return [wallToUtc(date, d.from, c.timeZone).getTime(), wallToUtc(date, d.to, c.timeZone).getTime()];
}

/** `from` + `minutes` phút làm việc. */
export function addBusinessMinutes(from: Date, minutes: number, c: BusinessCalendar): Date {
  if (!active(c)) return new Date(from.getTime() + minutes * MIN);
  let left = minutes * MIN;
  let at = from.getTime();
  let date = utcToWall(from, c.timeZone).date;
  // Tối đa ~ 3 năm lịch — chặn vòng lặp vô hạn khi dữ liệu lạ.
  for (let i = 0; i < 1100; i++) {
    const w = windowOf(c, date);
    if (w) {
      const start = Math.max(at, w[0]);
      if (start < w[1]) {
        if (start + left <= w[1]) return new Date(start + left);
        left -= w[1] - start;
      }
    }
    date = nextDate(date);
    at = Math.max(at, wallToUtc(date, '00:00', c.timeZone).getTime());
  }
  return new Date(from.getTime() + minutes * MIN);
}

/** Số phút làm việc trong [a, b) (b ≤ a → 0). */
export function businessMinutesBetween(a: Date, b: Date, c: BusinessCalendar): number {
  if (b <= a) return 0;
  if (!active(c)) return Math.round((b.getTime() - a.getTime()) / MIN);
  let total = 0;
  let date = utcToWall(a, c.timeZone).date;
  const last = utcToWall(b, c.timeZone).date;
  for (let i = 0; i < 1100; i++) {
    const w = windowOf(c, date);
    if (w) total += Math.max(0, Math.min(w[1], b.getTime()) - Math.max(w[0], a.getTime()));
    if (date >= last) break;
    date = nextDate(date);
  }
  return Math.round(total / MIN);
}

/**
 * Mốc "Sáng mai" khi tạm ẩn hội thoại (TIP-014c): giờ mở cửa (mặc định 08:00) của ngày làm việc kế tiếp
 * theo múi giờ & lịch làm việc workspace (`cal.timeZone`). Khi không bật giờ làm việc → 08:00 ngày mai.
 */
export function nextMorningSnoozeUtc(now: Date, cal: BusinessCalendar): Date {
  const local = utcToWall(now, cal.timeZone);
  let targetDate = nextDate(local.date);
  let openHour = '08:00';
  if (cal.enabled) {
    for (let i = 0; i < 7; i += 1) {
      const wd = cal.days.find((d) => d.day === weekdayOf(targetDate));
      if (wd?.on) {
        openHour = wd.from || '08:00';
        break;
      }
      targetDate = nextDate(targetDate);
    }
  } else {
    const wd = cal.days.find((d) => d.day === weekdayOf(targetDate));
    if (wd?.on && wd.from) openHour = wd.from;
  }
  return wallToUtc(targetDate, openHour, cal.timeZone);
}
