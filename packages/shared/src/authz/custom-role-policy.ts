// Biên quyền vai trò tuỳ biến (DC-298 — Q-028, Chủ nhà duyệt 2026-11-03; D27, D35). Dùng chung core (kiểm thật) + web (ma trận, nhãn).
// - Sáu quyền riêng Chủ sở hữu KHÔNG cấp cho vai trò tuỳ biến; nhân bản Chủ sở hữu bỏ sáu quyền này kèm thông báo.
// - contract.sign / payment.refund_approve (uỷ quyền D35) cấp được — nhưng chỉ khi bật rõ (không tự kèm khi nhân bản Quản lý).
// - Người không phải Chủ sở hữu có members.manage chỉ gán / mời vai trò có tập quyền ⊆ quyền của chính mình (không tự nâng / cấp vượt).
import { PERMISSIONS, SCOPE_MODULES, isPermissionKey, type DataScope, type PermissionKey, type ScopeModule } from './permissions';
import { ROLE_DEFS, isSystemRole } from './roles';

/** Sáu quyền chỉ Chủ sở hữu có — không vai trò tuỳ biến nào được cấp (DC-298). */
export const OWNER_ONLY_PERMISSIONS: readonly PermissionKey[] = [
  'privacy.erase', 'finance.manage', 'ai.governance', 'roles.manage', 'billing.manage', 'workspace.transfer_ownership',
];

/** Tiền tố khoá vai trò tuỳ biến — server sinh `custom:<uuid>`, client không tự đặt. */
export const CUSTOM_ROLE_PREFIX = 'custom:';
export const isCustomRoleKey = (k: string): boolean => k.startsWith(CUSTOM_ROLE_PREFIX) && k.length > CUSTOM_ROLE_PREFIX.length;
/** Khoá vai trò gán được qua member.invite / member.set_role: bốn vai trò hệ thống (trừ Chủ sở hữu) hoặc `custom:*`. */
export const isAssignableRoleKey = (k: string): boolean => (isSystemRole(k) && k !== 'owner') || isCustomRoleKey(k);

export const ROLE_SCOPES: readonly DataScope[] = ['own', 'team', 'all', 'none'];

/** Quyền vai trò tuỳ biến được phép chứa. */
export const grantablePermission = (p: PermissionKey): boolean => !OWNER_ONLY_PERMISSIONS.includes(p);

export interface RoleDraftIssue {
  field: 'permissions' | 'data_scope';
  reason: 'unknown' | 'owner_only' | 'missing_module' | 'invalid_scope';
  value?: string;
}

/** Kiểm tập quyền + phạm vi đầy đủ sáu module của vai trò tuỳ biến (không lặng lọc key sai, không nới module thiếu thành all). */
export function checkRoleDraft(permissions: readonly string[], scope: Record<string, unknown>): RoleDraftIssue[] {
  const out: RoleDraftIssue[] = [];
  for (const p of permissions) {
    if (!isPermissionKey(p)) out.push({ field: 'permissions', reason: 'unknown', value: p });
    else if (!grantablePermission(p)) out.push({ field: 'permissions', reason: 'owner_only', value: p });
  }
  for (const k of Object.keys(scope)) if (!(SCOPE_MODULES as readonly string[]).includes(k)) out.push({ field: 'data_scope', reason: 'invalid_scope', value: k });
  for (const m of SCOPE_MODULES) {
    const v = scope[m];
    if (v === undefined) out.push({ field: 'data_scope', reason: 'missing_module', value: m });
    else if (!ROLE_SCOPES.includes(v as DataScope)) out.push({ field: 'data_scope', reason: 'invalid_scope', value: m });
  }
  return out;
}

/** Bản nháp nhân bản từ vai trò hệ thống: bỏ quyền riêng Chủ sở hữu (trả về `dropped` để UI / preview thông báo). */
export function cloneSystemRole(key: string): { permissions: PermissionKey[]; scope: Record<ScopeModule, DataScope>; dropped: PermissionKey[] } | null {
  if (!isSystemRole(key)) return null;
  const def = ROLE_DEFS[key];
  // Chủ sở hữu có mọi quyền (kể cả hai quyền uỷ quyền D35) — nhân bản giữ phần cấp được; uỷ quyền D35 chỉ bật rõ ở editor (không tự kèm).
  const src = key === 'owner' ? [...PERMISSIONS] : [...def.permissions];
  const dropped = src.filter((p) => !grantablePermission(p) || (key === 'owner' && (p === 'contract.sign' || p === 'payment.refund_approve')));
  return { permissions: src.filter((p) => !dropped.includes(p)), scope: { ...def.scope }, dropped };
}

/** Quyền vai trò đích vượt quyền người gán (không phải Chủ sở hữu) — rỗng = gán được. */
export function escalationOf(target: readonly string[], actor: ReadonlySet<string>): string[] {
  return target.filter((p) => !actor.has(p));
}

const SCOPE_RANK: Record<DataScope, number> = { none: 0, own: 1, team: 2, all: 3 };
/** Module có phạm vi dữ liệu rộng hơn của người gán (vd. người gán `own`, vai trò đích `all`) — rỗng = không vượt. */
export function scopeEscalationOf(target: Record<ScopeModule, DataScope>, actor: Record<ScopeModule, DataScope>): ScopeModule[] {
  return SCOPE_MODULES.filter((m) => SCOPE_RANK[target[m] ?? 'none'] > SCOPE_RANK[actor[m] ?? 'none']);
}
