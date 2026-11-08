// Đầu vào lịch hẹn dùng chung (TIP-033b §3.2, §3.4): ngày lịch có thật (không để 2026-02-30 tràn sang tháng sau), giờ HH:mm 00–23:00–59,
// ngày cấu hình tri-state (kế thừa / nghỉ / giờ riêng), giờ tường → thời điểm theo múi workspace có kiểm giờ không tồn tại / lặp (DST),
// mốc nửa đêm hôm sau theo lịch (không cộng cứng 24 giờ). Thuần hàm — dùng chung actions (zod), core và mock FE.
import { utcToWall, wallToUtc } from '../time/wall-clock';

export const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" có thật trên lịch Gregory. */
export function isCalendarDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [+m[1]!, +m[2]!, +m[3]!];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

export const isHm = (s: string) => HM_RE.test(s);

/** Ngày kế tiếp theo lịch ("2026-12-31" → "2027-01-01"). */
export function nextDate(date: string): string {
  const t = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000);
  return t.toISOString().slice(0, 10);
}

export type LocalTime = { ok: true; at: Date } | { ok: false; reason: 'nonexistent_local_time' | 'ambiguous_local_time' };

/**
 * Giờ tường → thời điểm, từ chối thay vì đoán: giờ bị nhảy qua (DST tiến) → nonexistent; giờ lặp hai lần (DST lùi) → ambiguous (hợp đồng
 * date + HH:mm không phân biệt được hai thời điểm). Múi không DST (Asia/Ho_Chi_Minh) luôn ok.
 */
export function resolveLocal(date: string, hm: string, timeZone: string): LocalTime {
  const at = wallToUtc(date, hm, timeZone);
  const back = utcToWall(at, timeZone);
  if (back.date !== date || back.hm !== hm) return { ok: false, reason: 'nonexistent_local_time' };
  for (const shift of [-3_600_000, 3_600_000]) {
    const other = new Date(at.getTime() + shift);
    const w = utcToWall(other, timeZone);
    if (w.date === date && w.hm === hm) return { ok: false, reason: 'ambiguous_local_time' };
  }
  return { ok: true, at };
}

/** [đầu ngày, đầu ngày hôm sau) theo múi workspace — ngày 23 / 25 giờ khi đổi giờ vẫn đúng. */
export function dayBounds(date: string, timeZone: string): { start: Date; end: Date } {
  return { start: wallToUtc(date, '00:00', timeZone), end: wallToUtc(nextDate(date), '00:00', timeZone) };
}

/** Ngày cấu hình: `open = false` là nghỉ (giờ bỏ qua); `open = true` cần start < end, không qua đêm. */
export interface DayInput {
  weekday: number;
  open: boolean;
  start: string;
  end: string;
}

/** Lỗi theo trường (422): trùng thứ, thứ ngoài 0–6, giờ sai định dạng, bắt đầu ≥ kết thúc. Rỗng = hợp lệ. */
export function dayErrors(days: readonly DayInput[], field: string, exactSeven = false): Record<string, string> {
  const errs: Record<string, string> = {};
  if (exactSeven && days.length !== 7) errs[field] = 'seven_days';
  if (new Set(days.map((d) => d.weekday)).size !== days.length) errs[field] = 'duplicate_day';
  for (const d of days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) errs[`${field}.${d.weekday}`] = 'invalid_day';
    else if (!isHm(d.start) || !isHm(d.end)) errs[`${field}.${d.weekday}`] = 'invalid_time';
    else if (d.open && d.start >= d.end) errs[`${field}.${d.weekday}`] = 'from_after_to';
  }
  return errs;
}
