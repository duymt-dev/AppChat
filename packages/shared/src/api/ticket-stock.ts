// So sánh tồn ticket với hôm qua (TIP-034d §4.1) — dùng chung cho thẻ KPI màn Ticket (`ticketsMeta.stock_summary`) và action đọc
// `ticket.stock_summary` (Trợ lý). Năm số hiện tại + so với MỘT lần quan sát thật của ngày lịch trước (múi giờ workspace) trên CÙNG tập
// ticket hiện người xem còn thấy (`current_authorized_surviving`): ticket đã xoá / ẩn / ngoài quyền không tính ở cả hai phía — delta
// không phải tăng trưởng ròng của workspace. Không có quan sát → `unavailable` (không bao giờ prior / delta = 0 giả).
import { z } from 'zod';
import { STOCK_METRICS } from '../support/stock-metrics';

const n = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const signed = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const counts = z.object(Object.fromEntries(STOCK_METRICS.map((k) => [k, n])) as Record<(typeof STOCK_METRICS)[number], typeof n>);
const deltas = z.object(Object.fromEntries(STOCK_METRICS.map((k) => [k, signed])) as Record<(typeof STOCK_METRICS)[number], typeof signed>);

export const STOCK_UNAVAILABLE_REASONS = ['baseline_missing', 'source_unavailable', 'capture_unavailable', 'schema_unavailable'] as const;
export type StockUnavailableReason = (typeof STOCK_UNAVAILABLE_REASONS)[number];

export const ticketStockComparisonSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('available'),
    /** Thời điểm quan sát thật (ISO kèm offset múi giờ workspace) + ngày lịch của lần quan sát. */
    observed_at: z.string(),
    local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    prior: counts,
    delta: deltas,
  }),
  z.object({ status: z.literal('unavailable'), reason: z.enum(STOCK_UNAVAILABLE_REASONS) }),
]);

export const ticketStockSummarySchema = z.object({
  counts,
  /** Thời điểm đo (ISO kèm offset) — số đã cache không được hiểu là "ngay lúc này". */
  measured_at: z.string(),
  time_zone: z.string(),
  metric_version: z.number().int(),
  cohort: z.literal('current_authorized_surviving'),
  comparison: ticketStockComparisonSchema,
});

export type TicketStockSummary = z.infer<typeof ticketStockSummarySchema>;
export type TicketStockComparison = z.infer<typeof ticketStockComparisonSchema>;
