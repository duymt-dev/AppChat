// Đọc Ticket cho apps/api (Blueprint §4.4 support — shape packages/shared/src/api/tickets.ts): danh sách D42 (page + limit, deferred join
// `ticket_recent_idx`, lọc trạng thái / ưu tiên / nhóm / danh mục / người phụ trách / SLA / tìm không dấu / trường tuỳ biến, sắp xếp mới
// nhất hoặc ưu tiên), chi tiết (bình luận + lịch sử), meta (nhóm, danh mục, agent, thành viên, KPI 5 ô, gợi ý AI theo luật), cài đặt SLA.
import { TenantContexts, TenantSql as Prisma, type TenantDbResolver } from '@appchat/db';
import { SLA_DEFAULT, TICKET_CATEGORIES, interpolate, serverMessages, slaStateOf, utcToWall, type AuthzContext, type TicketRow } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CrmMembers } from '../../crm/public';
import { UUID, supportScopeSql, visibleTicket, type TicketRecord } from '../ticket-access';
import { searchSql } from '../actions/sla-config.handlers';
import { defaultPolicy, escalationOf, type SlaCalendar } from './sla-clock';
import type { SettingsReadService } from '../../identity/public';

export interface TicketViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}
export interface TicketFilter {
  status?: string;
  priority?: string;
  team?: string;
  category?: string;
  assignee?: string;
  sla?: string;
  q?: string;
  sort?: string;
  custom?: Record<string, string>;
}

const MAX_LIMIT = 100;
const PR = Prisma.sql`CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;

export class TicketsReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly cal: SlaCalendar,
    private readonly members: CrmMembers,
    private readonly now: () => Date,
    private readonly settings: SettingsReadService | null = null,
  ) {}

  private async tx<T>(v: TicketViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return (await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId))).$transaction(fn);
  }

  private async teams(tx: TenantTx, locale: string) {
    const rows = await tx.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
    return [...rows, { id: 'ai', name: serverMessages(locale).support.teamAi }];
  }

  private async rows(tx: TenantTx, list: TicketRecord[], v: TicketViewer, detail: boolean): Promise<TicketRow[]> {
    if (!list.length) return [];
    const { timeZone, locale } = await this.cal.of(v.workspaceId);
    const now = this.now();
    const iso = (d: Date) => utcToWall(d, timeZone).iso;
    const ids = list.map((t) => t.id);
    const [comments, events, agents, teams, names] = await Promise.all([
      detail ? tx.ticketComment.findMany({ where: { ticketId: { in: ids }, deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [],
      detail ? tx.ticketEvent.findMany({ where: { ticketId: { in: ids } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [],
      tx.aiAgent.findMany({ where: { id: { in: list.map((t) => t.assigneeAgentId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
      this.teams(tx, locale),
      this.members.names(list.map((t) => t.assigneeUserId)),
    ]);
    const agentName = new Map(agents.map((a) => [a.id, a.name]));
    const teamName = new Map(teams.map((x) => [x.id, x.name]));
    return list.map((t) => {
      const respondedAt = t.firstResponseAt ?? now;
      return {
        id: t.id,
        code: t.code,
        title: t.title,
        description: t.description,
        category: t.category,
        channel: t.channel as TicketRow['channel'],
        company: t.company,
        email: t.email,
        contact_id: t.contactId,
        status: t.status,
        priority: t.priority,
        assignee_user_id: t.assigneeUserId,
        assignee_agent_id: t.assigneeAgentId,
        assignee_name: t.assigneeAgentId ? (agentName.get(t.assigneeAgentId) ?? '') : (names.get(t.assigneeUserId ?? '') ?? ''),
        team_id: t.assigneeAgentId ? 'ai' : (t.teamId ?? ''),
        team_name: t.assigneeAgentId ? (teamName.get('ai') ?? '') : (teamName.get(t.teamId ?? '') ?? ''),
        sla_policy_name: t.slaPolicyName,
        frt_target_min: t.frtTargetMin,
        ttr_target_min: t.ttrTargetMin,
        frt_min: Math.max(0, Math.round((respondedAt.getTime() - t.createdAt.getTime()) / 60_000)),
        ttr_due_at: iso(t.ttrDueAt),
        paused_since: t.pausedSince ? iso(t.pausedSince) : null,
        sla_result: (t.slaResult as TicketRow['sla_result']) ?? null,
        close_reason: t.closeReason,
        escalations: t.escalations,
        reopened_count: t.reopenedCount,
        csat: t.csat,
        created_at: iso(t.createdAt),
        updated_at: iso(t.updatedAt),
        comments: comments.filter((c) => c.ticketId === t.id).map((c) => ({ id: c.id, author_type: c.authorType, author: c.authorName, body: c.body, internal: c.internal, at: iso(c.createdAt) })),
        events: events
          .filter((e) => e.ticketId === t.id)
          .map((e) => {
            const d = e.data as { status?: string; reason?: string };
            return { type: e.type, by: e.actorName || e.actorType, at: iso(e.createdAt), ...(d.status ? { status: d.status } : {}), ...(d.reason ? { reason: d.reason } : {}) };
          }),
        sla: slaStateOf({ status: t.status, slaResult: t.slaResult, start: t.ttrStartAt, due: t.ttrDueAt, pausedAt: t.pausedSince, now }),
        custom: t.custom as TicketRow['custom'],
      };
    });
  }

  private where(v: TicketViewer, f: TicketFilter, now: Date): Prisma.Sql[] {
    const parts = searchSql(v.authz, f, now);
    if (f.team && f.team !== 'all') parts.push(f.team === 'ai' ? Prisma.sql`t.assignee_agent_id IS NOT NULL` : Prisma.sql`t.team_id = ${f.team} AND t.assignee_agent_id IS NULL`);
    if (f.category && f.category !== 'all') parts.push(Prisma.sql`t.category = ${f.category}`);
    if (f.assignee && f.assignee !== 'all')
      parts.push(f.assignee === 'agent' ? Prisma.sql`t.assignee_agent_id IS NOT NULL` : UUID.test(f.assignee) ? Prisma.sql`t.assignee_user_id = ${f.assignee}::uuid` : Prisma.sql`FALSE`);
    for (const [key, want] of Object.entries(f.custom ?? {})) {
      if (!want || !/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
      parts.push(Prisma.sql`(t.custom -> ${key} @> to_jsonb(${want}::text) OR lower(t.custom ->> ${key}) LIKE ${`%${want.toLowerCase()}%`})`);
    }
    return parts;
  }

  async list(v: TicketViewer, f: TicketFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    return this.tx(v, async (tx) => {
      const w = Prisma.join(this.where(v, f, this.now()), ' AND ');
      const order = f.sort === 'priority' ? Prisma.sql`${PR}, t.created_at DESC, t.id DESC` : Prisma.sql`t.created_at DESC, t.id DESC`;
      const [cnt] = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM ticket t WHERE ${w}`;
      const ids = await tx.$queryRaw<{ id: string }[]>`SELECT t.id FROM ticket t WHERE ${w} ORDER BY ${order} LIMIT ${paged ? lim : MAX_LIMIT} OFFSET ${paged ? (pg - 1) * lim : 0}`;
      const recs = await tx.ticket.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
      const at = new Map(ids.map((r, i) => [r.id, i]));
      recs.sort((a, b) => at.get(a.id)! - at.get(b.id)!);
      const data = await this.rows(tx, recs, v, false);
      const total = Number(cnt?.n ?? 0);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  async get(v: TicketViewer, id: string): Promise<TicketRow> {
    return this.tx(v, async (tx) => (await this.rows(tx, [await visibleTicket(tx, v.authz, id)], v, true))[0]!);
  }

  async meta(v: TicketViewer) {
    const { timeZone, locale } = await this.cal.of(v.workspaceId);
    const now = this.now();
    return this.tx(v, async (tx) => {
      const scope = supportScopeSql(v.authz);
      const [counts] = await tx.$queryRaw<{ total: bigint; open: bigint; waiting: bigint; breach: bigint; risk: bigint; closed: bigint; unassigned: bigint; met: bigint; ai: bigint }[]>`
        SELECT count(*) AS total,
          count(*) FILTER (WHERE t.status = 'open') AS open,
          count(*) FILTER (WHERE t.status = 'waiting') AS waiting,
          count(*) FILTER (WHERE (t.status <> 'closed' AND coalesce(t.paused_since, ${now}) > t.ttr_due_at) OR (t.status = 'closed' AND t.sla_result = 'breached')) AS breach,
          count(*) FILTER (WHERE t.status <> 'closed' AND coalesce(t.paused_since, ${now}) <= t.ttr_due_at AND t.ttr_due_at - coalesce(t.paused_since, ${now}) <= interval '60 minutes') AS risk,
          count(*) FILTER (WHERE t.status = 'closed') AS closed,
          count(*) FILTER (WHERE t.status <> 'closed' AND t.assignee_user_id IS NULL AND t.assignee_agent_id IS NULL) AS unassigned,
          count(*) FILTER (WHERE t.status = 'closed' AND t.sla_result = 'met') AS met,
          count(*) FILTER (WHERE t.assignee_agent_id IS NOT NULL) AS ai
        FROM ticket t WHERE ${scope}`;
      const c = Object.fromEntries(Object.entries(counts!).map(([k, x]) => [k, Number(x)])) as Record<string, number>;
      const [used, agent, teams, members] = await Promise.all([
        tx.ticket.findMany({ distinct: ['category'], select: { category: true }, take: 50 }),
        // Agent nhận ticket khi bấm "Giao AI": agent đang chạy đầu tiên, chưa có thì agent đầu tiên của workspace.
        tx.aiAgent
          .findFirst({ where: { status: 'active', deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } })
          .then((a) => a ?? tx.aiAgent.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } })),
        this.teams(tx, locale),
        this.members.options(v.workspaceId),
      ]);
      const m = serverMessages(locale).support.ai;
      const ai: [string, string, string][] = [];
      if (c.breach || c.risk) ai.push(['overdue', m.overdue, interpolate(m.overdueHint, { breach: c.breach!, risk: c.risk! })]);
      if (c.unassigned) ai.push(['route', m.route, interpolate(m.routeHint, { n: c.unassigned })]);
      ai.push(['report', m.report, interpolate(m.reportHint, { met: c.closed ? Math.round((c.met! / c.closed) * 100) : 100, ai: c.ai!, breach: c.breach! })]);
      return {
        now: utcToWall(now, timeZone).iso,
        teams,
        categories: [...new Set([...TICKET_CATEGORIES, ...used.map((x) => x.category)])],
        agent: agent ? { id: agent.id, name: agent.name } : { id: '', name: '' },
        members,
        // Xu hướng so kỳ trước: chưa đủ lịch sử → để trống (FE ẩn mũi tên khi rỗng).
        trend: { total: '', open: '', waiting: '', breach: '', closed: '' },
        ai,
        counts: { total: c.total!, open: c.open!, waiting: c.waiting!, breach: c.breach!, closed: c.closed! },
      };
    });
  }

  /** Cài đặt › SLA: giờ làm việc (identity) + chính sách mặc định thật + leo thang + dự báo rủi ro (ticket còn mở sắp đến hạn ≤ 60′). */
  async slaSettings(v: TicketViewer) {
    const now = this.now();
    const base = this.settings ? await this.settings.sla(v.workspaceId) : null;
    return this.tx(v, async (tx) => {
      const p = await defaultPolicy(tx, now);
      const esc = escalationOf(p);
      const [r] = await tx.$queryRaw<{ at_risk: bigint; ai: bigint }[]>`
        SELECT count(*) AS at_risk, count(*) FILTER (WHERE t.assignee_agent_id IS NOT NULL) AS ai FROM ticket t
        WHERE t.status IN ('open', 'in_progress') AND t.ttr_due_at >= ${now} AND t.ttr_due_at - ${now} <= interval '60 minutes'`;
      const at = Number(r?.at_risk ?? 0);
      const ai = Number(r?.ai ?? 0);
      return {
        policy: { name: p.name, color: SLA_DEFAULT.color, scope: 'all', tier: 'all', on: p.active, frt_ai: p.frtAiMin, frt_human: p.frtHumanMin, ttr_ai: p.ttrAiMin, ttr_human: p.ttrHumanMin },
        tz: base?.tz ?? '',
        days: base?.days ?? [],
        pause_sla: base?.pause_sla ?? true,
        escalation: SLA_DEFAULT.escalation.map((e) => ({ key: e.key, color: e.color, on: esc[e.key] ?? e.on })),
        risk: { at_risk: at, ai, human: at - ai },
      };
    });
  }
}
