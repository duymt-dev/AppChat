// Chiếu kế hoạch nhập ra hợp đồng `@appchat/shared` (TIP-038b) + kiểm quyền nhập của thực thể trên người gọi HIỆN TẠI (quyền action
// nghiệp vụ, không suy từ quyền xem). Danh sách cột lấy lại từ tệp ở lần đọc chi tiết (không lưu tiêu đề riêng).
import {
  AppError,
  can,
  targetOf,
  transferSpec,
  type AuthzContext,
  type PermissionKey,
  type TransferDataset,
  type TransferEntity,
  type TransferPlanDto,
  type TransferTarget,
} from '@appchat/shared';

type PlanRow = {
  id: string;
  entity: string;
  dataset: string;
  datasetSchemaVersion: number;
  fileName: string;
  sheet: string | null;
  mapping: unknown;
  version: number;
  rowPolicy: string;
  status: string;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  applied: number;
  skipped: number;
  failed: number;
  jobId: string | null;
  error: string | null;
  expiresAt: Date;
  createdAt: Date;
};

/** Quyền nhập của thực thể / tập trên người gọi hiện tại: quyền nhập + quyền action bổ sung (tập hoạt động: crm.import ∩ crm.edit). */
export function requireImport(authz: AuthzContext, entity: TransferTarget) {
  const spec = transferSpec(entity);
  if (!spec.importReady) throw new AppError('VALIDATION_FAILED', 422, { entity: 'unsupported' });
  for (const perm of [spec.importPermission, ...(spec.alsoRequires ?? [])])
    if (!can(authz, perm as PermissionKey)) throw new AppError('FORBIDDEN', 403, { permission: perm });
}

export const canImport = (authz: AuthzContext, entity: TransferTarget) => {
  const spec = transferSpec(entity);
  return [spec.importPermission, ...(spec.alsoRequires ?? [])].every((perm) => can(authz, perm as PermissionKey));
};

export function planView(p: PlanRow, columns: string[]): TransferPlanDto {
  return {
    id: p.id,
    entity: p.entity as TransferEntity,
    dataset: p.dataset as TransferDataset,
    dataset_schema_version: p.datasetSchemaVersion,
    file_name: p.fileName,
    sheet: p.sheet,
    columns,
    mapping: (p.mapping ?? {}) as Record<string, string>,
    version: p.version,
    row_policy: p.rowPolicy as TransferPlanDto['row_policy'],
    status: p.status as TransferPlanDto['status'],
    counts: {
      total: p.total,
      valid: p.valid,
      invalid: p.invalid,
      duplicates: p.duplicates,
      applied: p.applied,
      skipped: p.skipped,
      failed: p.failed,
    },
    job_id: p.jobId,
    error: p.error,
    expires_at: p.expiresAt.toISOString(),
    created_at: p.createdAt.toISOString(),
  };
}

/** Kế hoạch của tập ghi cả tệp một lệnh (registry `atomic`). */
export const atomicPlan = (p: Pick<PlanRow, 'entity' | 'dataset'>) =>
  !!transferSpec(targetOf(p.entity as TransferEntity, p.dataset as TransferDataset)).atomic;

/** Commit được không: nháp, chưa hết hạn, có dòng hợp lệ; all_valid → không còn dòng lỗi (không âm thầm bỏ lỗi). */
export function commitBlocker(
  p: Pick<PlanRow, 'status' | 'expiresAt' | 'valid' | 'invalid' | 'rowPolicy' | 'entity' | 'dataset'>,
  now: Date,
): Record<string, string> | null {
  if (p.status !== 'draft') return { status: p.status };
  if (p.expiresAt <= now) return { plan_id: 'expired' };
  if (!p.valid) return { rows: 'none_valid' };
  if (p.rowPolicy === 'all_valid' && p.invalid) return { rows: 'has_invalid' };
  // Tập ghi cả tệp bằng MỘT lệnh (sản phẩm `product.import` 032b; danh mục ticket `ticket_categories.replace` 034b) — không bỏ được riêng
  // dòng lỗi; sửa tệp rồi lập kế hoạch mới.
  if (atomicPlan(p) && p.invalid) return { rows: 'has_invalid' };
  return null;
}
