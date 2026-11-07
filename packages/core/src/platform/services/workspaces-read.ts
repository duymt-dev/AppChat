// Danh sách workspace cho /admin › Workspaces (TIP-040 pha 4, AC07 / AC09): lọc trạng thái / gói / tìm tên-slug, keyset cursor
// (created_at desc, id desc), id trước rồi hydrate (index `workspace_status_created_idx`). Không mở DB tenant nào: số liệu lấy từ
// `workspace_stats` (job làm tươi) — chưa có → `stats: null` + `refreshed_at: null` (không giả số 0). Liên hệ chủ chỉ email.
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { decodeCursor, encodeCursor } from '../../billing/services/ledger-reader';

export interface WorkspaceQuery {
  status?: string;
  plan?: string;
  q?: string;
  cursor?: string;
  limit?: string;
}

export class WorkspacesReadService {
  constructor(private readonly db: PlatformDb) {}

  async list(q: WorkspaceQuery) {
    const n = q.limit ? Number(q.limit) : 50;
    if (!Number.isInteger(n) || n < 1 || n > 200) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    if (q.status && q.status !== 'active' && q.status !== 'suspended') throw new AppError('VALIDATION_FAILED', 400, { status: 'invalid' });
    if (q.plan && !/^[a-z0-9_-]{1,40}$/.test(q.plan)) throw new AppError('VALIDATION_FAILED', 400, { plan: 'invalid' });
    const c = q.cursor ? decodeCursor(q.cursor) : null;
    const text = q.q?.trim().slice(0, 60);
    const plan = q.plan ? await this.db.plan.findUnique({ where: { key: q.plan }, select: { id: true } }) : null;
    if (q.plan && !plan) return { data: [], next_cursor: null };
    const ids = await this.db.workspace.findMany({
      where: {
        ...(q.status ? { status: q.status as 'active' | 'suspended' } : {}),
        ...(plan ? { id: { in: (await this.db.subscription.findMany({ where: { planId: plan.id }, select: { workspaceId: true } })).map((s) => s.workspaceId) } } : {}),
        ...(text ? { OR: [{ name: { contains: text, mode: 'insensitive' as const } }, { slug: { contains: text.toLowerCase() } }] } : {}),
        ...(c ? { AND: [{ OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, id: { lt: c.id } }] }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: n + 1,
      select: { id: true, createdAt: true },
    });
    const page = ids.slice(0, n);
    const wsIds = page.map((r) => r.id);
    const [rows, subs, stats] = await Promise.all([
      this.db.workspace.findMany({ where: { id: { in: wsIds } } }),
      this.db.subscription.findMany({ where: { workspaceId: { in: wsIds } } }),
      this.db.workspaceStats.findMany({ where: { workspaceId: { in: wsIds } } }),
    ]);
    const owners = new Map((await this.db.user.findMany({ where: { id: { in: rows.map((r) => r.ownerUserId) } }, select: { id: true, email: true, name: true } })).map((u) => [u.id, u]));
    const plans = new Map((await this.db.plan.findMany({ where: { id: { in: subs.map((s) => s.planId) } }, select: { id: true, key: true, name: true } })).map((p) => [p.id, p]));
    const byWs = <T extends { workspaceId: string }>(xs: T[]) => new Map(xs.map((x) => [x.workspaceId, x]));
    const [sub, stat, ws] = [byWs(subs), byWs(stats), new Map(rows.map((r) => [r.id, r]))];
    return {
      data: page.map(({ id }) => {
        const w = ws.get(id)!;
        const s = sub.get(id);
        const st = stat.get(id);
        const p = s ? plans.get(s.planId) : undefined;
        const o = owners.get(w.ownerUserId);
        return {
          id,
          name: w.name,
          slug: w.slug,
          status: w.status,
          db_status: w.dbStatus,
          version: w.statusVersion,
          suspended_at: w.suspendedAt?.toISOString() ?? null,
          suspend_reason: w.suspendReason,
          owner: o ? { name: o.name, email: o.email } : null,
          subscription: s ? { plan_key: p?.key ?? null, plan_name: p?.name ?? null, status: s.status, ends_at: s.currentPeriodEnd?.toISOString() ?? null } : null,
          stats: st?.refreshedAt ? { contacts: st.contacts, conversations_30d: st.conversations30d, messages_30d: st.messages30d, db_size_bytes: String(st.dbSizeBytes), last_active_at: st.lastActiveAt?.toISOString() ?? null } : null,
          refreshed_at: st?.refreshedAt?.toISOString() ?? null,
          created_at: w.createdAt.toISOString(),
        };
      }),
      next_cursor: ids.length > n ? encodeCursor(page[page.length - 1]!) : null,
    };
  }
}
