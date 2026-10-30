// Đọc vai trò / permission / nhóm cho trang Vai trò & phân quyền (P0 chỉ đọc) — Blueprint §4.4 authz.
import { PERMISSION_GROUPS, ROLE_DEFS, isSystemRole } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';

export class RolesService {
  constructor(
    private readonly platform: PlatformDb,
    private readonly tenants: TenantDbResolver,
  ) {}

  async roles(workspaceId: string, userId: string) {
    const tenant = await this.tenants.get(TenantContexts.fromMembership(workspaceId, userId));
    const [rows, counts] = await Promise.all([
      tenant.role.findMany({ orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }] }),
      this.platform.membership.groupBy({ by: ['roleKey'], where: { workspaceId, status: 'active' }, _count: { _all: true } }),
    ]);
    const n = new Map(counts.map((c) => [c.roleKey, c._count._all]));
    return rows.map((r) => ({
      key: r.key,
      name: r.name,
      is_system: r.isSystem,
      // Vai trò hệ thống: định nghĩa từ code (DC-024) — bảng có thể cũ hơn code sau khi danh mục đổi.
      permissions: isSystemRole(r.key) ? [...ROLE_DEFS[r.key].permissions] : r.permissions,
      scope: isSystemRole(r.key) ? ROLE_DEFS[r.key].scope : r.dataScope,
      member_count: n.get(r.key) ?? 0,
    }));
  }

  permissions() {
    return Object.entries(PERMISSION_GROUPS).map(([module, permissions]) => ({ module, permissions }));
  }

  async teams(workspaceId: string, userId: string) {
    const tenant = await this.tenants.get(TenantContexts.fromMembership(workspaceId, userId));
    const [teams, members] = await Promise.all([tenant.team.findMany({ orderBy: { createdAt: 'asc' } }), tenant.teamMember.findMany()]);
    return teams.map((t) => ({ id: t.id, name: t.name, user_ids: members.filter((m) => m.teamId === t.id).map((m) => m.userId) }));
  }
}
