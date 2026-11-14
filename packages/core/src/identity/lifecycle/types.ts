// Kiểu + token DI của vòng đời workspace (TIP-041). Trạng thái DB tenant (registry `workspace.db_status`) chuyển bằng CAS:
//   active → archiving → archived            (lưu trữ)
//   archived → restoring → active            (khôi phục)
//   active | archived | suspended → deleting → deleted (xoá của Owner — pha 3; tombstone, sao lưu giữ 30 ngày rồi purge)
// Tạm dừng (suspend — TIP-040) ≠ lưu trữ: workspace tạm dừng không lưu trữ / khôi phục được tới khi admin mở lại.
import type { ArchiveStore, KeyRing } from '@appchat/db';

export const LIFECYCLE_OPS = ['archive', 'restore', 'delete'] as const;
export type LifecycleOp = (typeof LIFECYCLE_OPS)[number];
export type LifecycleStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'recovery_needed' | 'cancelled';
export type LifecycleSource = 'admin' | 'scan' | 'member' | 'owner' | 'recovery';

/** Bước của lệnh — trả qua API trạng thái (UI "Đang khôi phục" hiện bước). */
export type LifecycleStep =
  | 'queued'
  | 'quiesce'
  | 'dump'
  | 'verify'
  | 'manifest'
  | 'drop'
  | 'registry'
  | 'create'
  | 'restore'
  | 'migrate'
  | 'checks'
  | 'backup'
  | 'tombstone'
  | 'activate'
  | 'done';

export interface LifecycleJobRow {
  id: string;
  workspaceId: string;
  operation: LifecycleOp;
  generation: number;
  status: LifecycleStatus;
  step: LifecycleStep;
  expectedVersion: number;
  attempts: number;
  manifestId: string | null;
  /** Lệnh của lượt quét: mốc hoạt động đã dựa vào (kiểm lại sau quiesce). */
  basisAt?: Date | null;
  /** Lệnh xoá: db_status trước khi xoá — lỗi trước DROP trả về đúng trạng thái này. */
  fromDbStatus?: string | null;
  createdAt?: Date;
}

/** Cấu hình hạ tầng của vòng đời (worker ROLE=jobs) — dựng từ env ở lifecycle.providers. */
export interface LifecycleInfra {
  provisionerUrl: string;
  migratorUrl: string;
  tenantAppUrl: string;
  templateDb: string;
  store: ArchiveStore;
  keys: KeyRing;
  binDir?: string;
  allowedHosts: string[];
  maintenanceDb: string;
}

export const LIFECYCLE_INFRA = Symbol('LIFECYCLE_INFRA');
export const LIFECYCLE_QUEUE = Symbol('LIFECYCLE_QUEUE');

/** Đánh thức dispatcher (job BullMQ chỉ là tín hiệu — lệnh bền nằm ở `workspace_lifecycle_job`). */
export interface LifecycleWake {
  wake(jobId: string): Promise<void>;
}

/** Số lần thử tối đa một lệnh trước khi `failed` / `recovery_needed` (cảnh báo admin). */
export const LIFECYCLE_MAX_ATTEMPTS = 5;
/** Lease của worker đang chạy lệnh — hết hạn + lấy được khoá cluster mới tiếp quản. */
export const LIFECYCLE_LEASE_MS = 10 * 60_000;
