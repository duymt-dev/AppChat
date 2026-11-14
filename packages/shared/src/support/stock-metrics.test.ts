// TIP-034d AC1 (unit): vị từ tham chiếu năm số tồn — mốc hạn chính xác (bằng hạn không quá hạn, +1ms quá hạn), tạm dừng tính theo lúc
// dừng, đã đóng theo kết quả SLA; ngày trước theo lịch (qua tháng / năm / nhuận); đếm vượt số nguyên an toàn → lỗi rõ ràng.
import { describe, expect, it } from 'vitest';
import { isStockBreach, previousLocalDate, safeCount, stockCounts, ticketStockSummarySchema, type StockTicket } from '../index';

const now = new Date('2026-11-14T03:00:00.000Z');
const due = (ms: number) => new Date(now.getTime() + ms);
const t = (o: Partial<StockTicket>): StockTicket => ({ status: 'open', ttrDueAt: due(0), pausedSince: null, slaResult: null, ...o });

describe('isStockBreach', () => {
  it('đúng hạn không quá hạn; trễ 1ms là quá hạn; còn hạn không quá hạn', () => {
    expect(isStockBreach(t({ ttrDueAt: due(0) }), now)).toBe(false);
    expect(isStockBreach(t({ ttrDueAt: due(-1) }), now)).toBe(true);
    expect(isStockBreach(t({ ttrDueAt: due(1) }), now)).toBe(false);
  });

  it('đang chờ (tạm dừng) tính theo lúc dừng, không theo bây giờ', () => {
    expect(isStockBreach(t({ status: 'waiting', ttrDueAt: due(-60_000), pausedSince: due(-120_000) }), now)).toBe(false);
    expect(isStockBreach(t({ status: 'waiting', ttrDueAt: due(-60_000), pausedSince: due(-59_999) }), now)).toBe(true);
  });

  it('đã đóng theo kết quả SLA lúc đóng (không theo hạn hiện tại)', () => {
    expect(isStockBreach(t({ status: 'closed', ttrDueAt: due(-86_400_000), slaResult: 'met' }), now)).toBe(false);
    expect(isStockBreach(t({ status: 'closed', ttrDueAt: due(86_400_000), slaResult: 'breached' }), now)).toBe(true);
  });
});

describe('stockCounts', () => {
  it('open chỉ status open (không gồm in_progress); total đếm mọi ticket', () => {
    const c = stockCounts(
      [t({ status: 'open' }), t({ status: 'in_progress', ttrDueAt: due(-1) }), t({ status: 'waiting', pausedSince: due(-1), ttrDueAt: due(-2) }), t({ status: 'closed', slaResult: 'breached' })],
      now,
    );
    expect(c).toEqual({ total: 4, open: 1, waiting: 1, breach: 3, closed: 1 });
  });

  it('tập rỗng → 0', () => expect(stockCounts([], now)).toEqual({ total: 0, open: 0, waiting: 0, breach: 0, closed: 0 }));
});

describe('previousLocalDate / safeCount', () => {
  it('lùi một ngày lịch qua tháng, năm, 29/2', () => {
    expect(previousLocalDate('2026-11-14')).toBe('2026-11-13');
    expect(previousLocalDate('2026-03-01')).toBe('2026-02-28');
    expect(previousLocalDate('2028-03-01')).toBe('2028-02-29');
    expect(previousLocalDate('2027-01-01')).toBe('2026-12-31');
  });

  it('bigint an toàn → number; âm / vượt → RangeError', () => {
    expect(safeCount(5n)).toBe(5);
    expect(() => safeCount(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
    expect(() => safeCount(-1n)).toThrow(RangeError);
  });
});

describe('ticketStockSummarySchema', () => {
  const base = { counts: { total: 1, open: 1, waiting: 0, breach: 0, closed: 0 }, measured_at: '2026-11-14T10:00:00+07:00', time_zone: 'Asia/Ho_Chi_Minh', metric_version: 1, cohort: 'current_authorized_surviving' as const };

  it('unavailable không mang prior / delta; available bắt buộc đủ', () => {
    expect(ticketStockSummarySchema.parse({ ...base, comparison: { status: 'unavailable', reason: 'baseline_missing' } }).comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
    const parsed = ticketStockSummarySchema.parse({ ...base, comparison: { status: 'unavailable', reason: 'baseline_missing', prior: base.counts } });
    expect(parsed.comparison).not.toHaveProperty('prior');
    expect(() => ticketStockSummarySchema.parse({ ...base, comparison: { status: 'available', observed_at: 'x', local_date: '2026-11-13' } })).toThrow();
    expect(() => ticketStockSummarySchema.parse({ ...base, counts: { ...base.counts, total: -1 }, comparison: { status: 'unavailable', reason: 'baseline_missing' } })).toThrow();
  });
});
