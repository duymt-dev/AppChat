// Kỳ gói theo ngày đăng ký + chia phần kỳ còn lại (TIP-039, DC-242 / DC-243) — thuần, dùng chung core (tính) + web (hiển thị).
// Kỳ tháng neo theo NGÀY + GIỜ đăng ký ở múi workspace (không cộng 30 ngày, không ngày 1): ngày 31 gặp tháng ngắn → ngày cuối tháng, kỳ
// sau trở lại 31. Chia phần còn lại theo thời gian thực của kỳ (ms), số hữu tỷ bằng bigint, làm tròn half-up MỘT lần ở kết quả.
import { utcToWall, wallToUtc } from '../time/wall-clock';

/** Mốc neo kỳ: ngày (1–31) + giờ tường "HH:mm" ở múi workspace — chụp lúc kích hoạt gói trả phí. */
export interface PeriodAnchor {
  day: number;
  hm: string;
  timeZone: string;
}

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const pad = (n: number) => String(n).padStart(2, '0');

/** Mốc neo từ thời điểm kích hoạt. */
export function anchorOf(at: Date, timeZone: string): PeriodAnchor {
  const w = utcToWall(at, timeZone);
  return { day: Number(w.date.slice(8, 10)), hm: w.hm, timeZone };
}

/** Mốc bắt đầu kỳ thứ `n` (n = 0 là kỳ chứa ngày neo) tính từ năm / tháng gốc. */
function boundary(a: PeriodAnchor, year: number, month: number, n: number): Date {
  const idx = year * 12 + (month - 1) + n;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return wallToUtc(`${y}-${pad(m)}-${pad(Math.min(a.day, lastDay(y, m)))}`, a.hm, a.timeZone);
}

/** Cộng `months` tháng theo neo (ngày 31 → ngày cuối tháng ngắn, kỳ sau trở lại 31). `from` phải là một mốc kỳ. */
export function addMonthsAnchored(from: Date, months: number, a: PeriodAnchor): Date {
  const w = utcToWall(from, a.timeZone);
  return boundary(a, Number(w.date.slice(0, 4)), Number(w.date.slice(5, 7)), months);
}

/** Kỳ tháng (allocation Credit) chứa `at`: [start, end). `at` trước mốc neo của tháng → kỳ bắt đầu tháng trước. */
export function monthAt(at: Date, a: PeriodAnchor): { start: Date; end: Date } {
  const w = utcToWall(at, a.timeZone);
  const y = Number(w.date.slice(0, 4));
  const m = Number(w.date.slice(5, 7));
  const here = boundary(a, y, m, 0);
  const start = here.getTime() <= at.getTime() ? here : boundary(a, y, m, -1);
  return { start, end: addMonthsAnchored(start, 1, a) };
}

/** Khoá kỳ ổn định (ngày bắt đầu theo giờ workspace) — dùng làm khoá idempotent biên nhận cấp Credit. */
export const periodKey = (start: Date, timeZone: string) => utcToWall(start, timeZone).date;

/** a × num / den làm tròn half-up về số nguyên (a, num, den ≥ 0; den > 0) — không qua float. */
export function mulDivHalfUp(a: bigint, num: bigint, den: bigint): bigint {
  if (a < 0n || num < 0n || den <= 0n) throw new RangeError('mulDivHalfUp: âm / mẫu 0');
  return (2n * a * num + den) / (2n * den);
}

/**
 * Phần kỳ còn lại của một giá trị (tiền VND hoặc Credit): value × (end − at) / (end − start), half-up một lần (DC-243). `at` ngoài kỳ →
 * kẹp về [0, value]. 10.000 × 10/31 → 3.226; 1 × 1/2 → 1; 1 × 1/3 → 0.
 */
export function prorate(value: bigint, start: Date, end: Date, at: Date): bigint {
  const total = BigInt(end.getTime() - start.getTime());
  if (total <= 0n) throw new RangeError('prorate: kỳ rỗng');
  const left = BigInt(Math.min(Math.max(end.getTime() - at.getTime(), 0), end.getTime() - start.getTime()));
  return mulDivHalfUp(value, left, total);
}
