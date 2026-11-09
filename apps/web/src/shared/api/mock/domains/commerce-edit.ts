// Mock dùng chung cho sửa hợp đồng / đơn (TIP-032c), khớp server: người tạo `owner_user_id` bất biến (gửi lại đúng → bỏ qua, khác / null
// → 422 immutable); người phụ trách `assigned_user_id` (null = bỏ giao); `if_version` lệch → 409 STALE_VERSION; mỗi lần ghi tăng `version`.
import { ApiRequestError } from '@appchat/shared';

type Row = { owner_user_id: string; assigned_user_id?: string; assigned_name?: string; version?: number };

/** Seed fixture chưa có trường mới → người phụ trách = người tạo, version 1 (như backfill migration). */
export function withEditFields<T extends Row & { owner_name: string }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, assigned_user_id: r.assigned_user_id ?? r.owner_user_id, assigned_name: r.assigned_name ?? r.owner_name, version: r.version ?? 1 }));
}

export function checkVersion(r: Row, ifVersion: number | undefined) {
  if (ifVersion !== undefined && ifVersion !== (r.version ?? 1)) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'version', fields: { version: String(r.version ?? 1) } });
}

export function checkOwnerEcho(r: Row, sent: string | null | undefined) {
  if (sent === undefined || (sent !== null && sent !== '' && sent === r.owner_user_id)) return;
  throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'owner_user_id', fields: { 'patch.owner_user_id': 'immutable' } });
}

/** Áp người phụ trách (nếu có trong patch) + tăng version. */
export function applyAssigned(r: Row, assigned: string | null | undefined, names: Record<string, string>) {
  if (assigned !== undefined) Object.assign(r, { assigned_user_id: assigned ?? '', assigned_name: assigned ? (names[assigned] ?? assigned) : '' });
  bump(r);
}

export const bump = (r: Row) => {
  r.version = (r.version ?? 1) + 1;
};
