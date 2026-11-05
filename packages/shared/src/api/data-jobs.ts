// Việc dữ liệu nặng chạy nền (TIP-045b annex D) — hợp đồng FE ↔ BE của GET /v1/data-jobs/:id và /:id/items. Nhận việc qua action trả 202
// `job_accepted { job_id, action_log_id, status_url }` (kernel/actions/job-accepted.ts — nền chung với TIP-032b). Chỉ người tạo việc đọc /
// huỷ / thử lại (và còn quyền của action gốc). Tệp xuất tải qua `download_url` có hạn — không bao giờ là URL storage thô.
import { z } from 'zod';

export const DATA_JOB_STATUSES = ['queued', 'running', 'cancelling', 'cancelled', 'completed', 'failed'] as const;
export type DataJobStatus = (typeof DATA_JOB_STATUSES)[number];
export const DATA_JOB_ITEM_STATUSES = ['pending', 'done', 'failed', 'skipped'] as const;

/** Ngưỡng chạy nền: sửa hàng loạt > 50 bản ghi (concurrency §7), xuất > 5.000 dòng (TIP-045b). */
export const BULK_SYNC_MAX = 50;
export const EXPORT_SYNC_MAX = 5000;

export const dataJobSchema = z.object({
  id: z.string(),
  kind: z.string(),
  action_id: z.string(),
  status: z.enum(DATA_JOB_STATUSES),
  total: z.number().int(),
  done: z.number().int(),
  failed: z.number().int(),
  error: z.string().nullable(),
  /** Tệp kết quả (xuất) — link tải có hạn; null khi chưa xong / đã hết hạn / chính sách đổi. */
  download_url: z.string().nullable(),
  file_name: z.string().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type DataJobDto = z.infer<typeof dataJobSchema>;

export const dataJobItemSchema = z.object({ seq: z.number().int(), target_id: z.string(), status: z.enum(DATA_JOB_ITEM_STATUSES), error: z.string().nullable() });
export const dataJobItemsSchema = z.object({ data: z.array(dataJobItemSchema), next_cursor: z.string().nullable() });
export type DataJobItemDto = z.infer<typeof dataJobItemSchema>;

/** Kết quả từng bản ghi của lô đồng bộ (≤ 50) — cùng dạng biên nhận của việc nền. */
export const bulkItemResultSchema = z.object({ id: z.string(), status: z.enum(['done', 'failed', 'skipped']), error: z.string().nullable() });
export type BulkItemResult = z.infer<typeof bulkItemResultSchema>;
