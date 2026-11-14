// Kết quả sửa ticket hàng loạt (TIP-034c §1.2): `updated` giữ nghĩa cũ (số ticket áp dụng được, kể cả no-op báo rõ), thêm `changed_count`,
// kết quả TỪNG id theo thứ tự nhập (id lạ / ẩn cùng mã NOT_FOUND, không tiêu đề / trạng thái / người phụ trách), tham chiếu thao tác bền
// (data_job). Kết quả lấy từ biên nhận — không từ vòng lặp hay bộ đếm Redis. Hoàn tác hàng loạt (`ticket.bulk_undo`) cùng dạng.
import { z } from 'zod';
import { DATA_JOB_STATUSES } from './data-jobs';

/** Mã kết quả an toàn của một id (không phải ErrorCode HTTP — `NOT_APPLIED` = thao tác đã dừng trước khi tới id này). */
export const TICKET_BULK_OUTCOME_CODES = ['NOT_FOUND', 'SCOPE_FORBIDDEN', 'INVALID_TRANSITION', 'STALE_VERSION', 'VALIDATION_FAILED', 'FORBIDDEN', 'CONFLICT', 'UNDO_EXPIRED', 'NOT_APPLIED', 'INTERNAL'] as const;

export const ticketBulkOutcomeSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  /** Chỉ khi ok: false = đã đúng giá trị yêu cầu (no-op, không ghi, không event). */
  changed: z.boolean().optional(),
  /** Chưa xử lý xong (việc còn chạy) — không phải thành công, không phải lỗi. */
  pending: z.boolean().optional(),
  error: z.object({ code: z.string() }).optional(),
});
export type TicketBulkOutcome = z.infer<typeof ticketBulkOutcomeSchema>;

export const ticketBulkOperationSchema = z.object({
  job_id: z.string(),
  status: z.enum(DATA_JOB_STATUSES),
  total: z.number().int(),
  pending: z.number().int(),
});

export const ticketBulkResultSchema = z.object({
  updated: z.number().int(),
  changed_count: z.number().int(),
  failed: z.number().int(),
  /** Số id trùng đã gộp (một lần) khi chuẩn hoá tập chọn. */
  duplicates: z.number().int(),
  outcomes: z.array(ticketBulkOutcomeSchema),
  operation: ticketBulkOperationSchema,
});
export type TicketBulkResult = z.infer<typeof ticketBulkResultSchema>;

export const ticketBulkUndoResultSchema = z.object({
  undone: z.number().int(),
  conflicts: z.number().int(),
  failed: z.number().int(),
  outcomes: z.array(ticketBulkOutcomeSchema),
  operation: ticketBulkOperationSchema,
});
export type TicketBulkUndoResult = z.infer<typeof ticketBulkUndoResultSchema>;
