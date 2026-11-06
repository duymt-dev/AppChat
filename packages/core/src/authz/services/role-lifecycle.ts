// Vòng đời vai trò tuỳ biến (TIP-042, DC-298): đọc / khoá / kiểm bản nháp / nhân bản. Vai trò hệ thống định nghĩa từ code (ROLE_DEFS — DC-024),
// không sửa / xoá; vai trò tuỳ biến ở bảng `role` (key `custom:<uuid>` do server sinh, immutable). Tombstone (`deleted_at`) không resolve /
// gán / mời / nhận lời mời — mọi đường đọc vai trò để CẤP quyền đi qua `liveRole`.
import {
  AppError,
  CUSTOM_ROLE_PREFIX,
  ROLE_DEFS,
  SCOPE_MODULES,
  checkRoleDraft,
  cloneSystemRole,
  isCustomRoleKey,
  isPermissionKey,
  isSystemRole,
  type DataScope,
  type PermissionKey,
  type ScopeModule,
} from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { parseScope } from './authz-resolver';

export interface RoleDef {
  key: string;
  name: string;
  isSystem: boolean;
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  version: number;
}

type RoleRow = { id: string; key: string; name: string; isSystem: boolean; permissions: string[]; dataScope: unknown; version: number; deletedAt: Date | null; createdAt: Date };

export const roleSnap = (r: Pick<RoleRow, 'key' | 'name' | 'permissions' | 'dataScope' | 'version'>) => ({
  key: r.key, name: r.name, permissions: [...r.permissions], data_scope: parseScope(r.dataScope), version: r.version,
});

/** Định nghĩa vai trò CÒN HIỆU LỰC để cấp quyền: hệ thống từ code; tuỳ biến từ DB, tombstone / không có → null (fail closed). */
export async function liveRole(db: Pick<TenantDb, 'role'>, key: string): Promise<RoleDef | null> {
  if (isSystemRole(key)) return { key, name: key, isSystem: true, permissions: [...ROLE_DEFS[key].permissions], scope: ROLE_DEFS[key].scope, version: 1 };
  if (!isCustomRoleKey(key)) return null;
  const r = await db.role.findUnique({ where: { key }, select: { key: true, name: true, permissions: true, dataScope: true, version: true, deletedAt: true, isSystem: true } });
  if (!r || r.deletedAt || r.isSystem) return null;
  return { key: r.key, name: r.name, isSystem: false, permissions: r.permissions.filter(isPermissionKey), scope: parseScope(r.dataScope), version: r.version };
}

/** Khoá dòng vai trò tuỳ biến để sửa / xoá (FOR UPDATE) + CAS version. Hệ thống → 422; lạ / tombstone → 404; lệch version → 409. */
export async function lockCustomRole(tx: TenantTx, key: string, ifVersion?: number): Promise<RoleRow> {
  if (isSystemRole(key)) throw new AppError('VALIDATION_FAILED', 422, { role_key: 'system_role' });
  if (!isCustomRoleKey(key)) throw new AppError('VALIDATION_FAILED', 422, { role_key: 'invalid' });
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM role WHERE key = ${key} AND deleted_at IS NULL FOR UPDATE`;
  if (!rows.length) throw new AppError('NOT_FOUND', 404, { role_key: 'not_found' });
  const r = (await tx.role.findUniqueOrThrow({ where: { key } })) as RoleRow;
  if (r.isSystem) throw new AppError('VALIDATION_FAILED', 422, { role_key: 'system_role' });
  if (ifVersion !== undefined && ifVersion !== r.version) throw new AppError('STALE_VERSION', 409, { version: String(r.version) });
  return r;
}

/** Kiểm bản nháp (không lặng lọc): quyền lạ / quyền riêng Chủ sở hữu / thiếu module / phạm vi sai → 422 nêu đúng chỗ. */
export function assertRoleDraft(permissions: readonly string[], scope: Record<string, unknown>): { permissions: PermissionKey[]; scope: Record<ScopeModule, DataScope> } {
  const issues = checkRoleDraft(permissions, scope);
  if (issues.length) {
    const fields: Record<string, string> = {};
    for (const i of issues) fields[i.value ? `${i.field}.${i.value}` : i.field] = i.reason;
    throw new AppError('VALIDATION_FAILED', 422, fields);
  }
  return {
    permissions: [...new Set(permissions)] as PermissionKey[],
    scope: Object.fromEntries(SCOPE_MODULES.map((m) => [m, scope[m] as DataScope])) as Record<ScopeModule, DataScope>,
  };
}

/** Nguồn nhân bản: vai trò hệ thống (bỏ quyền riêng Chủ sở hữu, trả `dropped`) hoặc vai trò tuỳ biến còn sống. */
export async function cloneSource(db: Pick<TenantDb, 'role'>, key: string): Promise<{ permissions: PermissionKey[]; scope: Record<ScopeModule, DataScope>; dropped: PermissionKey[] }> {
  const sys = cloneSystemRole(key);
  if (sys) return sys;
  const r = await liveRole(db, key);
  if (!r) throw new AppError('NOT_FOUND', 404, { clone_from_key: 'not_found' });
  return { permissions: r.permissions, scope: r.scope, dropped: [] };
}

export const newCustomKey = (uuid: string) => `${CUSTOM_ROLE_PREFIX}${uuid}`;

/** Chuẩn hoá tên để kiểm trùng (không dấu, không phân biệt hoa thường, gộp khoảng trắng). */
export const foldName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

/** Tên vai trò không trùng vai trò tuỳ biến còn sống khác (vai trò hệ thống hiển thị theo i18n nên không so). */
export async function assertRoleNameFree(tx: Pick<TenantDb, 'role'>, name: string, exceptKey?: string): Promise<void> {
  const rows = await tx.role.findMany({ where: { isSystem: false, deletedAt: null }, select: { key: true, name: true } });
  const n = foldName(name);
  if (rows.some((r) => r.key !== exceptKey && foldName(r.name) === n)) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
}
