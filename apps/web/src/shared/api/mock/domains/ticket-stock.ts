// Mock "tồn ticket so với hôm qua" (TIP-034d §4.7) — chỉ cho UI / E2E chế độ mock, KHÔNG phải bằng chứng mốc lịch sử thật (native tự chụp).
// Mốc hôm qua mock = prior cố định theo kịch bản trên CÙNG tập ticket người xem thấy. Kịch bản đổi qua `localStorage.ac_mock_stock`:
// - (không đặt) / `valid`: có mốc, delta = hiện tại − prior;
// - `missing`: chưa có mốc (baseline_missing);
// - `legacy`: backend cũ — không có `stock_summary` (UI "chưa rõ");
// - `scope_lost`: nguồn của mốc không còn dùng được (source_unavailable).
import { STOCK_METRICS, type StockCounts, type TicketStockSummary } from '@appchat/shared';
import type { MockDb } from '../store';
import type { MockHandler } from '../handlers';
import { MOCK_NOW } from './quotes';

export const MOCK_STOCK_KEY = 'ac_mock_stock';
type Scenario = 'valid' | 'missing' | 'legacy' | 'scope_lost';
const OBSERVED = '2026-06-23T09:15:00+07:00';

const scenario = (): Scenario => {
  try {
    const v = typeof window === 'undefined' ? null : window.localStorage.getItem(MOCK_STOCK_KEY);
    return v === 'missing' || v === 'legacy' || v === 'scope_lost' ? v : 'valid';
  } catch {
    return 'valid';
  }
};

/** Prior mock: lệch cố định so với số hiện tại (không âm) — đủ để thấy tăng / giảm / không đổi ở năm thẻ. */
const priorOf = (c: StockCounts): StockCounts => ({
  total: Math.max(0, c.total - 2),
  open: c.open + 1,
  waiting: c.waiting,
  breach: Math.max(0, c.breach - 1),
  closed: Math.max(0, c.closed - 2),
});

export function mockStockSummary(counts: StockCounts): TicketStockSummary | undefined {
  const s = scenario();
  if (s === 'legacy') return undefined;
  const base = { counts, measured_at: MOCK_NOW, time_zone: 'Asia/Ho_Chi_Minh', metric_version: 1, cohort: 'current_authorized_surviving' as const };
  if (s === 'missing') return { ...base, comparison: { status: 'unavailable', reason: 'baseline_missing' } };
  if (s === 'scope_lost') return { ...base, comparison: { status: 'unavailable', reason: 'source_unavailable' } };
  const prior = priorOf(counts);
  const delta = Object.fromEntries(STOCK_METRICS.map((k) => [k, counts[k] - prior[k]])) as StockCounts;
  return { ...base, comparison: { status: 'available', observed_at: OBSERVED, local_date: OBSERVED.slice(0, 10), prior, delta } };
}

/** Action đọc `ticket.stock_summary` (mock): cùng số với `/tickets/meta` của cùng người xem; `result_id` null (mock không có tập đóng góp). */
export const ticketStockHandlers = (meta: (db: MockDb) => { counts: StockCounts }): Record<string, MockHandler> => ({
  'ticket.stock_summary': {
    execute: (db) => {
      const s = mockStockSummary(meta(db).counts);
      return s ? { ...s, result_id: null } : { ...mockStockSummaryUnsupported(meta(db).counts), result_id: null };
    },
  },
});

/** Backend cũ không trả `stock_summary` → action vẫn có hình hợp lệ: chưa so được. */
const mockStockSummaryUnsupported = (counts: StockCounts): TicketStockSummary => ({
  counts,
  measured_at: MOCK_NOW,
  time_zone: 'Asia/Ho_Chi_Minh',
  metric_version: 1,
  cohort: 'current_authorized_surviving',
  comparison: { status: 'unavailable', reason: 'schema_unavailable' },
});
