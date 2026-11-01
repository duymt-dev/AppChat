// Thành viên workspace cho crm (DB nền tảng — tenant-db §3: không FK xuyên DB, kiểm tồn tại qua membership):
// tên người phụ trách trong danh sách, ô chọn người (`GET /v1/members`), kiểm user được gán là thành viên active.
import { AppError, ROLE_NAMES, isSystemRole } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';

export interface MemberInfo {
  id: string;
  name: string;
  roleKey: string;
}

export class CrmMembers {
  constructor(private readonly platform: Pick<PlatformDb, 'membership' | 'user' | 'workspace'>) {}

  /** Thành viên active (Owner đầu, rồi theo tên). */
  async list(workspaceId: string): Promise<MemberInfo[]> {
    const [ms, ws] = await Promise.all([
      this.platform.membership.findMany({ where: { workspaceId, status: 'active' }, select: { userId: true, roleKey: true } }),
      this.platform.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } }),
    ]);
    const users = await this.platform.user.findMany({ where: { id: { in: ms.map((m) => m.userId) } }, select: { id: true, name: true, email: true } });
    const name = new Map(users.map((u) => [u.id, u.name || u.email]));
    return ms
      .map((m) => ({ id: m.userId, name: name.get(m.userId) ?? '', roleKey: m.userId === ws?.ownerUserId ? 'owner' : m.roleKey }))
      .sort((a, b) => Number(b.roleKey === 'owner') - Number(a.roleKey === 'owner') || a.name.localeCompare(b.name, 'vi'));
  }

  /** `GET /v1/members` — `{ id, name, role }` (role = tên vai trò). */
  async options(workspaceId: string) {
    return (await this.list(workspaceId)).map((m) => ({ id: m.id, name: m.name, role: isSystemRole(m.roleKey) ? ROLE_NAMES[m.roleKey] : m.roleKey.replace(/^custom:/, '') }));
  }

  /** Tên theo id (người đã rời workspace vẫn hiện tên). */
  async names(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
    const want = [...new Set(ids.filter((x): x is string => !!x))];
    if (!want.length) return new Map();
    const users = await this.platform.user.findMany({ where: { id: { in: want } }, select: { id: true, name: true, email: true } });
    return new Map(users.map((u) => [u.id, u.name || u.email]));
  }

  /** Khoá vai trò của người gọi (Owner theo workspace) — quyền xem trường tuỳ biến, bố cục Hồ sơ 360° theo vai trò. */
  async roleOf(workspaceId: string, userId: string | null): Promise<string> {
    if (!userId) return 'owner';
    const [m, ws] = await Promise.all([
      this.platform.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { roleKey: true } }),
      this.platform.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } }),
    ]);
    return ws?.ownerUserId === userId ? 'owner' : (m?.roleKey ?? 'sales');
  }

  /** User là thành viên active của workspace — không → 422 `{ [field]: 'not_member' }`. */
  async assertMember(workspaceId: string, userId: string, field: string): Promise<MemberInfo> {
    const m = (await this.list(workspaceId)).find((x) => x.id === userId);
    if (!m) throw new AppError('VALIDATION_FAILED', 422, { [field]: 'not_member' });
    return m;
  }
}
