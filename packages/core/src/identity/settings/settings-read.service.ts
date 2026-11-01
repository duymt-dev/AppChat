// Đọc Cài đặt (TIP-013) đúng shape FE (`packages/shared/src/api/settings.ts`): Tổng quan / Ngôn ngữ (`workspace` + thẻ workspace
// của người xem), Thành viên (active + lời mời còn chờ, hoạt động cuối), Vai trò (5 vai trò hệ thống, chỉ đọc — D27), giờ làm việc.
// Không phụ thuộc billing: gói / hạn mức đọc thẳng bảng subscription / plan ở DB nền tảng.
import {
  FREE_PLAN_KEY,
  PERMISSIONS,
  ROLE_COLOR,
  ROLE_DEFS,
  SLA_DEFAULT,
  SYSTEM_ROLES,
  WORKSPACE_KIND_COLOR,
  avatarColor,
  initialOf,
  tzLabel,
  workspaceKind,
  type MembersPageDto,
  type SlaSettingsDto,
  type WorkspaceSettingsDto,
} from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import { generalOf, workingHoursOf } from './workspace-settings';

/** Hoạt động < 20 phút = online (access token 15 phút → app đang mở xoay refresh token ít nhất mỗi 15 phút — DC-050). */
export const ONLINE_WINDOW_MS = 20 * 60_000;
const NO_DEPT = '—';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export class SettingsReadService {
  constructor(
    private readonly db: PlatformDb,
    private readonly now: () => Date,
  ) {}

  /** Gói hiện tại theo workspace; chưa có subscription (chưa khai báo) → gói Miễn phí (như QuotaService). */
  private async plans(workspaceIds: string[]) {
    const subs = await this.db.subscription.findMany({ where: { workspaceId: { in: workspaceIds } }, select: { workspaceId: true, planId: true } });
    const plans = await this.db.plan.findMany({ where: { OR: [{ id: { in: subs.map((s) => s.planId) } }, { key: FREE_PLAN_KEY }] } });
    const byId = new Map(plans.map((p) => [p.id, p]));
    const free = plans.find((p) => p.key === FREE_PLAN_KEY) ?? null;
    const bySub = new Map(subs.map((s) => [s.workspaceId, byId.get(s.planId) ?? null]));
    return (ws: string) => (bySub.has(ws) ? bySub.get(ws)! : free);
  }

  async workspace(workspaceId: string, userId: string): Promise<WorkspaceSettingsDto> {
    const ws = await this.db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const [profile, owner, mine] = await Promise.all([
      this.db.businessProfile.findUnique({ where: { workspaceId } }),
      this.db.user.findUnique({ where: { id: ws.ownerUserId }, select: { email: true } }),
      this.db.membership.findMany({ where: { userId, status: 'active' }, select: { workspaceId: true } }),
    ]);
    const ids = mine.map((m) => m.workspaceId);
    const [cards, seats, planOf] = await Promise.all([
      this.db.workspace.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
      this.db.membership.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: ids }, status: 'active' }, _count: { _all: true } }),
      this.plans(ids),
    ]);
    const used = new Map(seats.map((s) => [s.workspaceId, s._count._all]));
    const g = generalOf(ws.settings);
    return {
      workspace: {
        id: ws.id,
        name: ws.name,
        initial: initialOf(ws.name),
        legal_name: profile?.legalName ?? ws.name,
        website: g.website ?? '',
        tax_code: profile?.taxCode ?? '',
        address: profile?.address ?? '',
        support_phone: g.support_phone ?? profile?.phone ?? '',
        admin_email: g.admin_email ?? owner?.email ?? '',
        locale: ws.locale === 'en' ? 'en' : 'vi',
        timezone: ws.timezone,
        date_format: g.date_format ?? 'DD/MM/YYYY',
        currency: 'VND',
      },
      workspaces: cards.map((w) => {
        const p = planOf(w.id);
        const kind = workspaceKind(p ? { key: p.key, segment: p.segment } : null);
        return {
          id: w.id,
          name: w.name,
          plan: p?.name ?? '',
          seats: `${used.get(w.id) ?? 0}/${p?.maxUsers ?? '∞'}`,
          color: WORKSPACE_KIND_COLOR[kind],
          current: w.id === workspaceId,
        };
      }),
    };
  }

  async members(workspaceId: string, tenant: TenantDb, q = ''): Promise<MembersPageDto> {
    const now = this.now();
    const [rows, invites, planOf, ws] = await Promise.all([
      this.db.membership.findMany({ where: { workspaceId, status: 'active' }, select: { userId: true, roleKey: true, joinedAt: true, createdAt: true } }),
      this.db.invite.findMany({ where: { workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'asc' } }),
      this.plans([workspaceId]),
      this.db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerUserId: true } }),
    ]);
    const userIds = rows.map((r) => r.userId);
    const [users, seen, teams, links] = await Promise.all([
      this.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, lastLoginAt: true } }),
      this.db.refreshToken.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _max: { createdAt: true } }),
      tenant.team.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
      tenant.teamMember.findMany({ where: { userId: { in: userIds } }, select: { teamId: true, userId: true } }),
    ]);
    const userOf = new Map(users.map((u) => [u.id, u]));
    const lastOf = new Map(seen.map((s) => [s.userId, s._max.createdAt]));
    const teamName = new Map(teams.map((t) => [t.id, t.name]));
    const deptOf = (uid: string) =>
      links
        .filter((l) => l.userId === uid)
        .map((l) => teamName.get(l.teamId))
        .filter(Boolean)
        .join(', ') || NO_DEPT;
    const rank = (uid: string) => (uid === ws.ownerUserId ? 0 : 1);

    const members = [...rows]
      .sort((a, b) => rank(a.userId) - rank(b.userId) || (a.joinedAt ?? a.createdAt).getTime() - (b.joinedAt ?? b.createdAt).getTime())
      .map((r) => {
        const u = userOf.get(r.userId);
        const last = lastOf.get(r.userId) ?? u?.lastLoginAt ?? null;
        const online = !!last && now.getTime() - last.getTime() < ONLINE_WINDOW_MS;
        return {
          id: r.userId,
          name: u?.name || u?.email.split('@')[0] || '',
          email: u?.email ?? '',
          role: r.userId === ws.ownerUserId ? 'owner' : r.roleKey,
          dept: deptOf(r.userId),
          color: avatarColor(r.userId),
          last: online ? 'online' : (last?.toISOString() ?? 'never'),
          status: online ? ('active' as const) : ('offline' as const),
          invite: false,
        };
      });
    const pending = invites.map((i) => ({
      id: i.id,
      name: i.name?.trim() || i.email.split('@')[0]!,
      email: i.email,
      role: i.roleKey,
      dept: NO_DEPT,
      color: avatarColor(i.id),
      last: 'never',
      status: 'pending' as const,
      invite: true,
    }));
    const all = [...members, ...pending];
    const needle = fold(q.trim());
    const data = needle ? all.filter((m) => [m.name, m.email, m.dept].some((v) => fold(v).includes(needle))) : all;
    return { data, total: all.length, seat_limit: planOf(workspaceId)?.maxUsers ?? null, next_cursor: null };
  }

  async roles(workspaceId: string) {
    const ws = await this.db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerUserId: true } });
    const rows = await this.db.membership.findMany({ where: { workspaceId, status: 'active' }, select: { userId: true, roleKey: true } });
    const roleOf = (r: { userId: string; roleKey: string }) => (r.userId === ws.ownerUserId ? 'owner' : r.roleKey);
    return {
      roles: SYSTEM_ROLES.map((key) => ({
        key,
        color: ROLE_COLOR[key],
        count: rows.filter((r) => roleOf(r) === key).length,
        permissions: [...ROLE_DEFS[key].permissions],
        scope: { ...ROLE_DEFS[key].scope },
      })),
      permissions: [...PERMISSIONS],
    };
  }

  /** Giờ làm việc thật + múi giờ; chính sách / leo thang / rủi ro mặc định — support (TIP-034) ghép chính sách thật từ `sla_policy`. */
  async sla(workspaceId: string): Promise<SlaSettingsDto> {
    const ws = await this.db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { settings: true, timezone: true } });
    const wh = workingHoursOf(ws.settings);
    const { escalation, ...policy } = SLA_DEFAULT;
    return {
      policy: { ...policy, scope: 'all', tier: 'all', on: true },
      tz: tzLabel(ws.timezone),
      days: wh.days,
      pause_sla: wh.pause_sla,
      escalation: escalation.map((e) => ({ ...e })),
      risk: { at_risk: 0, ai: 0, human: 0 },
    };
  }
}
