// AuthzContext của (workspace, user) — Blueprint §3.2 bước 3, rbac-permissions §4–7.
// Owner = workspace.owner_user_id (không theo tên vai trò). Vai trò hệ thống: định nghĩa từ code (ROLE_DEFS — DC-024);
// vai trò tuỳ biến `custom:*`: bảng `role` của DB tenant. Uỷ quyền: membership.delegations ∩ DELEGABLE_PERMISSIONS.
// Cache Redis 60 s; khoá gồm phiên bản authz của workspace — `invalidate(ws)` tăng phiên bản (đổi vai trò / nhóm).
import {
  DELEGABLE_PERMISSIONS,
  PERMISSIONS,
  ROLE_DEFS,
  SCOPE_MODULES,
  isPermissionKey,
  isSystemRole,
  type AuthzContext,
  type DataScope,
  type PermissionKey,
  type ScopeModule,
} from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';

export const AUTHZ_CACHE_TTL_SEC = 60;
const SCOPES: readonly DataScope[] = ['own', 'team', 'all', 'none'];

export interface AuthzCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSec: number): Promise<unknown>;
  incr(key: string): Promise<number>;
}

export interface MembershipInput {
  roleKey: string;
  delegations: readonly string[];
}

interface Cached {
  isOwner: boolean;
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  teamIds: string[];
  teamUserIds: string[];
}

const NONE: Record<ScopeModule, DataScope> = Object.fromEntries(SCOPE_MODULES.map((m) => [m, 'none'])) as Record<ScopeModule, DataScope>;
const ALL_SCOPE: Record<ScopeModule, DataScope> = Object.fromEntries(SCOPE_MODULES.map((m) => [m, 'all'])) as Record<ScopeModule, DataScope>;

/** data_scope jsonb của vai trò tuỳ biến → chỉ nhận module + giá trị hợp lệ, thiếu = none. */
export function parseScope(raw: unknown): Record<ScopeModule, DataScope> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(SCOPE_MODULES.map((m) => [m, SCOPES.includes(o[m] as DataScope) ? (o[m] as DataScope) : 'none'])) as Record<ScopeModule, DataScope>;
}

export class AuthzResolver {
  /** Số lần đọc DB (test kiểm cache). */
  loads = 0;

  constructor(
    private readonly platform: PlatformDb,
    private readonly tenants: TenantDbResolver,
    private readonly cache: AuthzCache | null,
  ) {}

  async resolve(workspaceId: string, userId: string, m: MembershipInput): Promise<AuthzContext> {
    const key = this.cache ? await this.cacheKey(workspaceId, userId, m) : null;
    const hit = key ? await this.cache!.get(key) : null;
    const data: Cached = hit ? (JSON.parse(hit) as Cached) : await this.load(workspaceId, userId, m);
    if (key && !hit) await this.cache!.set(key, JSON.stringify(data), 'EX', AUTHZ_CACHE_TTL_SEC);
    return { userId, isOwner: data.isOwner, permissions: new Set(data.permissions), scope: data.scope, teamIds: data.teamIds, teamUserIds: data.teamUserIds };
  }

  /** Đổi vai trò / nhóm / uỷ quyền trong workspace → mọi AuthzContext cũ hết hiệu lực ngay. */
  async invalidate(workspaceId: string): Promise<void> {
    await this.cache?.incr(`authz:ver:${workspaceId}`);
  }

  private async cacheKey(ws: string, userId: string, m: MembershipInput): Promise<string> {
    const ver = (await this.cache!.get(`authz:ver:${ws}`)) ?? '0';
    return `authz:${ws}:${ver}:${userId}:${m.roleKey}:${[...m.delegations].sort().join(',')}`;
  }

  private async load(workspaceId: string, userId: string, m: MembershipInput): Promise<Cached> {
    this.loads++;
    const ws = await this.platform.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
    const isOwner = ws?.ownerUserId === userId;
    const tenant = await this.tenants.get(TenantContexts.fromMembership(workspaceId, userId));
    const teams = await tenant.teamMember.findMany({ where: { userId }, select: { teamId: true } });
    const teamIds = teams.map((t) => t.teamId);
    const mates = teamIds.length
      ? await tenant.teamMember.findMany({ where: { teamId: { in: teamIds } }, select: { userId: true }, distinct: ['userId'] })
      : [];
    const teamUserIds = mates.map((x) => x.userId);

    if (isOwner) return { isOwner, permissions: [...PERMISSIONS], scope: ALL_SCOPE, teamIds, teamUserIds };
    let permissions: PermissionKey[] = [];
    let scope = NONE;
    if (isSystemRole(m.roleKey)) {
      permissions = [...ROLE_DEFS[m.roleKey].permissions];
      scope = ROLE_DEFS[m.roleKey].scope;
    } else {
      const role = await tenant.role.findUnique({ where: { key: m.roleKey }, select: { permissions: true, dataScope: true } });
      if (role) {
        permissions = role.permissions.filter(isPermissionKey);
        scope = parseScope(role.dataScope);
      }
    }
    const delegated = m.delegations.filter((d): d is PermissionKey => DELEGABLE_PERMISSIONS.includes(d as PermissionKey));
    return { isOwner, permissions: [...new Set([...permissions, ...delegated])], scope, teamIds, teamUserIds };
  }
}
