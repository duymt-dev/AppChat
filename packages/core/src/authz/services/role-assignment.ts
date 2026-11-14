// Gán vai trò (TIP-042, DC-298): member.invite / member.set_role / hoàn tác / nhận lời mời đều qua đây — vai trò đích phải CÒN SỐNG trong đúng
// tenant (tombstone / key lạ → 422, không fallback vai trò khác) và người gán không phải Chủ sở hữu không được cấp vượt quyền / phạm vi của
// chính mình (không tự nâng quyền qua vai trò tuỳ biến đặc quyền). Không tin permission / key client gửi — định nghĩa đọc từ code / DB.
import { AppError, escalationOf, scopeEscalationOf, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { liveRole, type RoleDef } from './role-lifecycle';

/** Vai trò còn hiệu lực hoặc 422 (`role: not_found`). Chủ sở hữu không gán qua đây (chuyển chủ là action riêng). */
export async function assignableRole(db: Pick<TenantDb, 'role'>, key: string): Promise<RoleDef> {
  if (key === 'owner') throw new AppError('VALIDATION_FAILED', 422, { role: 'owner' });
  const r = await liveRole(db, key);
  if (!r) throw new AppError('VALIDATION_FAILED', 422, { role: 'not_found' });
  return r;
}

/** Người gán (không phải Chủ sở hữu) không cấp quyền / phạm vi vượt chính mình → 403 kèm quyền / module vượt. */
export function assertNoEscalation(actor: AuthzContext, role: RoleDef): void {
  if (actor.isOwner) return;
  const perms = escalationOf(role.permissions, actor.permissions as ReadonlySet<string>);
  const scope = scopeEscalationOf(role.scope, actor.scope);
  if (perms.length || scope.length) {
    throw new AppError('FORBIDDEN', 403, {
      role: 'escalation',
      ...(perms.length ? { permissions: perms.slice(0, 10).join(',') } : {}),
      ...(scope.length ? { data_scope: scope.join(',') } : {}),
    });
  }
}

/** Kiểm đủ cho một lần gán bởi người dùng: vai trò sống + không vượt quyền. */
export async function assertAssignable(db: Pick<TenantDb, 'role'>, actor: AuthzContext, key: string): Promise<RoleDef> {
  const r = await assignableRole(db, key);
  assertNoEscalation(actor, r);
  return r;
}
