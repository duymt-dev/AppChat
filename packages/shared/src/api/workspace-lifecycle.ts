// Trạng thái vòng đời workspace (TIP-041): `GET /v1/workspace/lifecycle` (thành viên còn hiệu lực — chỉ DB nền tảng, không mở DB tenant).
// FE thẻ "Đang khôi phục workspace…" poll shape này; bước / lỗi đã che (mã), không đường dẫn bản lưu trữ / thông tin kết nối.
import { z } from 'zod';

export const LIFECYCLE_DB_STATUSES = ['provisioning', 'active', 'suspended', 'archiving', 'archived', 'restoring', 'deleting', 'deleted'] as const;

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
  /** Yêu cầu đóng băng mới nhất của workspace (Owner xem kết quả — TIP-041 pha 3). Chỉ trả cho Owner; thành viên khác null. */
  freeze_request: z
    .object({ id: z.string(), status: z.enum(['pending', 'approved', 'rejected', 'cancelled']), created_at: z.string(), decided_at: z.string().nullable() })
    .nullable()
    .optional(),
});

/** Bản xem trước xoá workspace (`GET /v1/workspace/delete-preview` — chỉ Owner). */
export const workspaceDeletePreviewSchema = z.object({
  workspace_id: z.string(),
  name: z.string(),
  db_status: z.string(),
  status_version: z.number().int(),
  members: z.number().int(),
  paid_days_left: z.number().int().nullable(),
  plan_name: z.string().nullable(),
  topup_credits: z.number(),
  backup_retention_days: z.number().int(),
  retained: z.array(z.string()),
});
export type WorkspaceDeletePreviewDto = z.infer<typeof workspaceDeletePreviewSchema>;

/** Hàng yêu cầu đóng băng ở panel admin (`GET /v1/admin/freeze-requests`). */
export const freezeRequestRowSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  workspace_name: z.string(),
  requested_by: z.string(),
  reason: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  version: z.number().int(),
  decision_reason: z.string().nullable(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
});
export type FreezeRequestRowDto = z.infer<typeof freezeRequestRowSchema>;
export type WorkspaceLifecycleDto = z.infer<typeof workspaceLifecycleSchema>;
