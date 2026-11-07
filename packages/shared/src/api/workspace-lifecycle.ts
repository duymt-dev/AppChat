// Trạng thái vòng đời workspace (TIP-041): `GET /v1/workspace/lifecycle` (thành viên còn hiệu lực — chỉ DB nền tảng, không mở DB tenant).
// FE thẻ "Đang khôi phục workspace…" poll shape này; bước / lỗi đã che (mã), không đường dẫn bản lưu trữ / thông tin kết nối.
import { z } from 'zod';

export const LIFECYCLE_DB_STATUSES = ['provisioning', 'active', 'suspended', 'archiving', 'archived', 'restoring', 'deleting'] as const;

export const workspaceLifecycleSchema = z.object({
  workspace_id: z.string(),
  db_status: z.enum(LIFECYCLE_DB_STATUSES),
  /** Lệnh vòng đời mới nhất (null = chưa từng). */
  job: z
    .object({
      id: z.string(),
      operation: z.enum(['archive', 'restore', 'delete']),
      status: z.enum(['pending', 'running', 'succeeded', 'failed', 'recovery_needed', 'cancelled']),
      step: z.string(),
      attempts: z.number().int(),
      /** Mã lỗi gọn (không chi tiết hạ tầng). */
      error: z.string().nullable(),
    })
    .nullable(),
  /** Cảnh báo lưu trữ đang hiệu lực (gói Miễn phí không hoạt động): ngày dự kiến lưu trữ. */
  archive_on: z.string().nullable(),
});
export type WorkspaceLifecycleDto = z.infer<typeof workspaceLifecycleSchema>;
