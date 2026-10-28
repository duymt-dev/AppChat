// Tính ngày cho các chế độ xem (thuần chuỗi YYYY-MM-DD theo múi giờ workspace — không phụ thuộc giờ máy).
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(ms(d) + n * 86_400_000).toISOString().slice(0, 10);
/** Thứ trong tuần, 0 = Thứ 2 … 6 = Chủ nhật. */
export const dowMon = (d: string) => (new Date(ms(d)).getUTCDay() + 6) % 7;
export const weekStart = (d: string) => addDays(d, -dowMon(d));
export const monthStart = (d: string) => `${d.slice(0, 8)}01`;
export const daysInMonth = (d: string) => {
  const [y, m] = d.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
};
export const addMonths = (d: string, n: number) => {
  const [y, m] = d.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 10);
};

/** Khoảng ngày cần tải cho một chế độ xem (danh sách = một ngày như prototype "Hôm nay"). */
export const rangeOf = (view: string, anchor: string): [string, string] => {
  if (view === 'week') return [weekStart(anchor), addDays(weekStart(anchor), 6)];
  if (view === 'month') {
    const s = monthStart(anchor);
    return [s, addDays(s, daysInMonth(s) - 1)];
  }
  return [anchor, anchor];
};
export const dayOf = (iso: string) => iso.slice(0, 10);
export const hmOf = (iso: string) => iso.slice(11, 16);
export const minOf = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
