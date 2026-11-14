// Năm số tồn ticket của thẻ KPI (TIP-034d §1.1) — vị từ THAM CHIẾU thuần, cùng nghĩa từng chữ với SQL ở
// core `support/trends/metrics-sql.ts` (test so khớp cả hai ở mốc hạn, +1ms, tạm dừng, đã đóng). Quá hạn dùng mốc chính xác của meta
// (không làm tròn phút như huy hiệu SLA ở ticket-state.ts): chưa đóng và (thời điểm dừng SLA ?? bây giờ) > hạn TTR; đã đóng thì theo
// kết quả SLA lúc đóng. Đúng bằng hạn KHÔNG phải quá hạn.

export const STOCK_METRIC_VERSION = 1;
export const STOCK_METRICS = ['total', 'open', 'waiting', 'breach', 'closed'] as const;
export type StockMetric = (typeof STOCK_METRICS)[number];
export type StockCounts = Record<StockMetric, number>;

export interface StockTicket {
  status: string;
  ttrDueAt: Date;
  pausedSince: Date | null;
  slaResult: string | null;
}

/** Quá hạn TTR tại `now` (mốc chính xác — không làm tròn). */
export function isStockBreach(t: StockTicket, now: Date): boolean {
  if (t.status === 'closed') return t.slaResult === 'breached';
  return (t.pausedSince ?? now).getTime() > t.ttrDueAt.getTime();
}

/** Một ticket đóng góp vào năm số (total luôn 1). */
export function stockFlags(status: string, breached: boolean): StockCounts {
  return { total: 1, open: status === 'open' ? 1 : 0, waiting: status === 'waiting' ? 1 : 0, breach: breached ? 1 : 0, closed: status === 'closed' ? 1 : 0 };
}

export const emptyStock = (): StockCounts => ({ total: 0, open: 0, waiting: 0, breach: 0, closed: 0 });

/** Cộng năm số của một tập ticket (tham chiếu cho test — server đếm trong SQL). */
export function stockCounts(rows: readonly StockTicket[], now: Date): StockCounts {
  const out = emptyStock();
  for (const r of rows) {
    const f = stockFlags(r.status, isStockBreach(r, now));
    for (const k of STOCK_METRICS) out[k] += f[k];
  }
  return out;
}

/** Ngày lịch trước `date` (YYYY-MM-DD) — không phụ thuộc múi giờ máy chủ. */
export function previousLocalDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** bigint đếm → số nguyên an toàn; vượt → lỗi rõ ràng (không mất chính xác âm thầm — §5.4). */
export function safeCount(n: bigint | number): number {
  const v = typeof n === 'bigint' ? n : BigInt(n);
  if (v < 0n || v > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('stock_count_out_of_range');
  return Number(v);
}
