// Đọc vai trò / permission / nhóm — một nguồn domain cho `GET /v1/roles` và `GET /v1/settings/roles` (TIP-042: settings adapter thêm màu /
// số lượng, không tự map SYSTEM_ROLES riêng). Vai trò hệ thống định nghĩa từ code (DC-024); vai trò tuỳ biến còn sống từ bảng `role`.
import { CUSTOM_ROLE_COLORS, PERMISSIONS, PERMISSION_GROUPS, ROLE_COLOR, ROLE_DEFS, ROLE_NAMES, SYSTEM_ROLES, isSystemRole, type DataScope, type PermissionKey, type ScopeModule } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { parseScope } from './authz-resolver';

export interface RoleView {
  key: string;
  name: string;
  is_system: boolean;
  version: number;
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  member_count: number;
}

export class RolesService {
  constructor(
    private readonly platform: PlatformDb,
    private readonly tenants: TenantDbResolver,
  ) {}

  /** Vai trò hệ thống (thứ tự cố định) + vai trò tuỳ biến còn sống theo ngày tạo; số thành viên active theo vai trò (Chủ sở hữu theo owner_user_id). */
  async roles(workspaceId: string, userId: string): Promise<RoleView[]> {
    const tenant = await this.tenants.get(TenantContexts.fromMembership(workspaceId, userId));
    const [custom, rows, ws] = await Promise.all([
      tenant.role.findMany({
        where: { isSystem: false, deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { key: true, name: true, version: true, permissions: true, dataScope: true },
      }),
      this.platform.membership.findMany({ where: { workspaceId, status: 'active' }, select: { userId: true, roleKey: true } }),
      this.platform.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerUserId: true } }),
    ]);
    const count = new Map<string, number>();
    for (const r of rows) {
      const k = r.userId === ws.ownerUserId ? 'owner' : r.roleKey;
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    const sys: RoleView[] = SYSTEM_ROLES.map((key) => ({
      key, name: ROLE_NAMES[key], is_system: true, version: 1, permissions: [...ROLE_DEFS[key].permissions], scope: { ...ROLE_DEFS[key].scope }, member_count: count.get(key) ?? 0,
    }));
    return [
      ...sys,
      ...custom.map((r) => ({
        key: r.key,
        name: r.name,
        is_system: false,
        version: r.version,
        permissions: r.permissions.filter((p): p is PermissionKey => (PERMISSIONS as readonly string[]).includes(p)),
        scope: parseScope(r.dataScope),
        member_count: count.get(r.key) ?? 0,
      })),
    ];
  }

  /** Adapter Cài đặt › Vai trò & phân quyền: thêm màu nhãn; giữ trường cũ (count). */
  async settingsRoles(workspaceId: string, userId: string) {
    const roles = await this.roles(workspaceId, userId);
    let i = 0;
    return {
      roles: roles.map((r) => ({
        key: r.key,
        name: r.name,
        is_system: r.is_system,
        version: r.version,
        color: isSystemRole(r.key) ? ROLE_COLOR[r.key] : CUSTOM_ROLE_COLORS[i++ % CUSTOM_ROLE_COLORS.length]!,
        count: r.member_count,
        permissions: r.permissions,
        scope: r.scope,
      })),
      permissions: [...PERMISSIONS],
    };
  }

  permissions() {
    return Object.entries(PERMISSION_GROUPS).map(([module, permissions]) => ({ module, permissions }));
  }

  async teams(workspaceId: string, userId: string) {
    const tenant = await this.tenants.get(TenantContexts.fromMembership(workspaceId, userId));
    const [teams, members] = await Promise.all([
      tenant.team.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, name: true, version: true, leadUserId: true } }),
      tenant.teamMember.findMany({ select: { teamId: true, userId: true } }),
    ]);
    // Chỉ thành viên còn active (người đã rời workspace không hiện trong nhóm dù dòng team_member chưa dọn).
    const active = new Set(
      (await this.platform.membership.findMany({ where: { workspaceId, status: 'active', userId: { in: [...new Set(members.map((m) => m.userId))] } }, select: { userId: true } })).map((m) => m.userId),
    );
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      lead_user_id: t.leadUserId,
      user_ids: members.filter((m) => m.teamId === t.id && active.has(m.userId)).map((m) => m.userId),
      version: t.version,
    }));
  }
}
