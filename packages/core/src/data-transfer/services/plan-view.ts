// Chiếu kế hoạch nhập ra hợp đồng `@appchat/shared` (TIP-038b) + kiểm quyền nhập của thực thể trên người gọi HIỆN TẠI (quyền action
// nghiệp vụ, không suy từ quyền xem). Danh sách cột lấy lại từ tệp ở lần đọc chi tiết (không lưu tiêu đề riêng).
import {
  AppError,
  can,
  transferSpec,
  type AuthzContext,
  type PermissionKey,
  type TransferEntity,
  type TransferPlanDto,
} from '@appchat/shared';

type PlanRow = {
  id: string;
  entity: string;
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

export function requireImport(authz: AuthzContext, entity: TransferEntity) {
  const spec = transferSpec(entity);
  if (!spec.importReady) throw new AppError('VALIDATION_FAILED', 422, { entity: 'unsupported' });
  if (!can(authz, spec.importPermission as PermissionKey))
    throw new AppError('FORBIDDEN', 403, { permission: spec.importPermission });
}

export function planView(p: PlanRow, columns: string[]): TransferPlanDto {
  return {
    id: p.id,
    entity: p.entity as TransferEntity,
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

/** Commit được không: nháp, chưa hết hạn, có dòng hợp lệ; all_valid → không còn dòng lỗi (không âm thầm bỏ lỗi). */
export function commitBlocker(
  p: Pick<PlanRow, 'status' | 'expiresAt' | 'valid' | 'invalid' | 'rowPolicy' | 'entity'>,
  now: Date,
): Record<string, string> | null {
  if (p.status !== 'draft') return { status: p.status };
  if (p.expiresAt <= now) return { plan_id: 'expired' };
  if (!p.valid) return { rows: 'none_valid' };
  if (p.rowPolicy === 'all_valid' && p.invalid) return { rows: 'has_invalid' };
  // Sản phẩm ghi bằng `product.import` trên CẢ tệp (032b) — không bỏ được riêng dòng lỗi; sửa tệp rồi lập kế hoạch mới.
  if (p.entity === 'product' && p.invalid) return { rows: 'has_invalid' };
  return null;
}
