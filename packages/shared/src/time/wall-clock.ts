// Giờ tường theo múi workspace ↔ thời điểm UTC (lịch hẹn — Blueprint §2.2 start_at timestamptz; FE hiển thị giờ workspace, không theo máy).
// Đúng cả múi có giờ mùa hè (lấy lệch tại chính thời điểm đó).

function parts(at: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' })
      .formatToParts(at)
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
}

const offsetMin = (at: Date, timeZone: string) => {
  const p = parts(at, timeZone);
  const wall = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
};

/** "YYYY-MM-DD" + "HH:mm" giờ tường của múi → Date (UTC). */
export function wallToUtc(date: string, hm: string, timeZone: string): Date {
  const wall = Date.parse(`${date}T${hm}:00Z`);
  const guess = wall - offsetMin(new Date(wall), timeZone) * 60_000;
  return new Date(wall - offsetMin(new Date(guess), timeZone) * 60_000);
}

/** Date → { date: YYYY-MM-DD, hm: HH:mm, weekday: 0 = Thứ Hai … 6 = Chủ nhật, iso: có offset giờ workspace }. */
export function utcToWall(at: Date, timeZone: string) {
  const p = parts(at, timeZone);
  const off = offsetMin(at, timeZone);
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const tz = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  const date = `${p.year}-${p.month}-${p.day}`;
  const hm = `${p.hour}:${p.minute}`;
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday!);
  return { date, hm, weekday, iso: `${date}T${hm}:${p.second}${tz}` };
}

/** Thứ của ngày "YYYY-MM-DD" (0 = Thứ Hai). */
export const weekdayOf = (date: string) => (new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay() + 6) % 7;
