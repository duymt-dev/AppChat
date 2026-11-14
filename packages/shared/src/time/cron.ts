// Cron 5 trường theo giờ tường của múi workspace (tác vụ Cowork theo lịch — Blueprint §5.4): `phút giờ ngày tháng thứ`.
// Hỗ trợ `*`, số, danh sách `a,b`, khoảng `a-b`, bước `*/n` / `a-b/n`; thứ 0 hoặc 7 = Chủ nhật. Ngày và thứ cùng giới hạn → khớp
// một trong hai (như cron chuẩn). `nextCronRun` tìm lần chạy kế tiếp SAU mốc cho trước, đúng cả múi có giờ mùa hè (wallToUtc).
import { utcToWall, wallToUtc } from './wall-clock';

interface Field {
  set: Set<number>;
  any: boolean;
}
export interface CronSpec {
  minute: Field;
  hour: Field;
  dom: Field;
  month: Field;
  dow: Field;
}

const RANGES: [number, number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];

function field(src: string, [lo, hi]: [number, number]): Field | null {
  const set = new Set<number>();
  for (const part of src.split(',')) {
    const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(part);
    if (!m) return null;
    const step = m[4] ? Number(m[4]) : 1;
    const a = m[1] === '*' ? lo : Number(m[2]);
    const b = m[1] === '*' ? hi : m[3] !== undefined ? Number(m[3]) : m[4] ? hi : a;
    if (step < 1 || a < lo || b > hi || a > b) return null;
    for (let v = a; v <= b; v += step) set.add(v);
  }
  return { set, any: src === '*' };
}

/** Phân tích biểu thức; sai cú pháp / ngoài khoảng → null. */
export function parseCron(expr: string): CronSpec | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const f = parts.map((p, i) => field(p, RANGES[i]!));
  if (f.some((x) => !x)) return null;
  const [minute, hour, dom, month, dow] = f as Field[];
  if (dow!.set.has(7)) dow!.set.add(0);
  return { minute: minute!, hour: hour!, dom: dom!, month: month!, dow: dow! };
}

export const isValidCron = (expr: string) => parseCron(expr) !== null;

const pad = (n: number) => String(n).padStart(2, '0');

/** Lần chạy kế tiếp (UTC) sau `after`, theo giờ tường của `timeZone`; không có trong 400 ngày → null. */
export function nextCronRun(expr: string, after: Date, timeZone: string): Date | null {
  const c = parseCron(expr);
  if (!c) return null;
  const hours = [...c.hour.set].sort((a, b) => a - b);
  const mins = [...c.minute.set].sort((a, b) => a - b);
  const start = utcToWall(after, timeZone).date;
  const base = Date.parse(`${start}T00:00:00Z`);
  for (let d = 0; d < 400; d++) {
    const day = new Date(base + d * 86_400_000);
    const [y, mo, dd] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()];
    if (!c.month.set.has(mo)) continue;
    const domOk = c.dom.set.has(dd);
    const dowOk = c.dow.set.has(day.getUTCDay());
    if (!(c.dom.any || c.dow.any ? domOk && dowOk : domOk || dowOk)) continue;
    const date = `${y}-${pad(mo)}-${pad(dd)}`;
    for (const h of hours)
      for (const m of mins) {
        const at = wallToUtc(date, `${pad(h)}:${pad(m)}`, timeZone);
        if (at.getTime() > after.getTime()) return at;
      }
  }
  return null;
}
