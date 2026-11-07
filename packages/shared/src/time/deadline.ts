// Hạn theo ngày (money-time-numbering §2.3): kết thúc lúc 23:59:59.999 của ngày (mốc + N) theo giờ workspace — gửi 01/07 10:00 hiệu
// lực 15 ngày → 16/07 23:59:59.999 (giờ VN). Không phụ thuộc múi giờ máy chủ.

/** Lệch (ms) giữa giờ tường của `timeZone` và UTC tại thời điểm `at`. */
function offsetMs(at: Date, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, Number(x.value)]),
  ) as Record<string, number>;
  return Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!) - Math.floor(at.getTime() / 1000) * 1000;
}

/** 23:59:59.999 của ngày (ngày của `anchor` theo `timeZone`) + `days`. */
export function dayEndAfter(anchor: Date, days: number, timeZone: string): Date {
  const local = new Date(anchor.getTime() + offsetMs(anchor, timeZone));
  const endLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, 23, 59, 59, 999);
  // Đổi giờ tường → UTC (lấy lệch tại chính thời điểm đó — đúng cả múi có giờ mùa hè).
  const guess = endLocal - offsetMs(new Date(endLocal), timeZone);
  return new Date(endLocal - offsetMs(new Date(guess), timeZone));
}

/** Số ngày lịch còn lại tới hạn (theo giờ workspace): 0 = hết hạn hôm nay, âm = đã quá. */
export function daysLeft(now: Date, deadline: Date, timeZone: string): number {
  const day = (d: Date) => {
    const l = new Date(d.getTime() + offsetMs(d, timeZone));
    return Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) / 86_400_000;
  };
  return day(deadline) - day(now);
}
