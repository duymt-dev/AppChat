// Các khối dữ liệu của `GET /v1/dashboard` (TIP-038 pha 2) — mỗi khối kiểm quyền + scope riêng; không quyền → khối rỗng (không payload ẩn),
// lỗi một khối không làm lộ khối khác. Không còn số mẫu prototype: thẻ thống kê / kênh / agent / AI hôm nay đếm từ DB tenant theo ngày
// workspace (mốc ở JS — Q-053), không cộng dry-run.
import { TenantSql as Prisma } from '@appchat/db';
import { STAGE_COLOR, SOURCE_STYLE, can, createFmt, interpolate, serverMessages, sourceOfChannel, utcToWall, wallToUtc, type AuthzContext, type DashboardDto, type FollowUpItemDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { convScopeSql } from '../../inbox/services/access';
import { insightAuthz } from '../metrics/common';
import { FOLLOW_UP_DAYS, visibleFollowUps, type FollowUpRow } from './follow-ups';

const DAY = 86_400_000;
type Tx = Pick<TenantTx, '$queryRaw' | 'followUp' | 'contact' | 'channelAccount' | 'aiAgent' | 'integrationConnection' | 'notification'>;
export interface Place { timeZone: string; locale: string }

export const dayBounds = (now: Date, timeZone: string) => {
  const today = utcToWall(now, timeZone).date;
  const from = wallToUtc(today, '00:00', timeZone);
  const next = new Date(Date.parse(`${today}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
  return { today, from, to: wallToUtc(next, '00:00', timeZone) };
};

const initial = (name: string) => name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? '';
const AVATARS = ['#2A6FDB', '#1B9E5A', '#E8602C', '#6E48E6', '#0E9B94', '#DD2A7B', '#6D28D9', '#C9820B'];
const avatarOf = (id: string) => AVATARS[parseInt(id.replace(/-/g, '').slice(-4), 16) % AVATARS.length]!;

/** Việc follow (≤ 5 theo hạn) + tổng còn lại người xem thấy. */
export async function followUpBlock(tx: Tx, authz: AuthzContext, now: Date, place: Place): Promise<{ items: FollowUpItemDto[]; total: number }> {
  if (!can(authz, 'crm.view')) return { items: [], total: 0 };
  const { rows, total } = await visibleFollowUps(tx, insightAuthz(authz), 5);
  const m = serverMessages(place.locale);
  const { from } = dayBounds(now, place.timeZone);
  return { items: rows.map((r) => followItem(r, m, now, from)), total };
}

/** Hạn trước 00:00 hôm nay (giờ workspace) = quá hạn; còn lại = đến hạn hôm nay (việc chỉ sinh khi đã tới hạn). */
function followItem(r: FollowUpRow, m: ReturnType<typeof serverMessages>, now: Date, startOfToday: Date): FollowUpItemDto {
  const src = sourceOfChannel(r.last_channel ?? 'manual');
  const stage = r.stage as keyof typeof m.crm.stage;
  const overdue = r.due_at < startOfToday;
  return {
    id: r.id,
    contact_id: r.contact_id,
    name: r.name,
    initial: initial(r.name),
    avatar: avatarOf(r.contact_id),
    channel: SOURCE_STYLE[src].label.charAt(0),
    channel_bg: SOURCE_STYLE[src].color,
    stage: m.crm.stage[stage] ?? r.stage,
    stage_color: (STAGE_COLOR as Record<string, string>)[r.stage] ?? STAGE_COLOR.all,
    service: interpolate(m.insights.follow.service, { n: Math.floor((now.getTime() - r.due_at.getTime()) / DAY) + FOLLOW_UP_DAYS }),
    due: overdue ? m.insights.follow.overdue : m.insights.follow.today,
    due_at: r.due_at.toISOString(),
    overdue,
    version: r.version,
    route: `/customers?c=${r.contact_id}`,
  };
}

/** AI hôm nay: run thật (không dry-run) / action đã chạy / chuyển người — trong scope inbox người xem; Credit chỉ cho agents.manage / billing.manage. */
export async function aiTodayBlock(tx: Tx, authz0: AuthzContext, now: Date, place: Place): Promise<DashboardDto['ai_today']> {
  return aiWindow(tx, authz0, dayBounds(now, place.timeZone));
}

/** AI trong một khoảng [from, to) — Tổng quan (hôm nay) + email tóm tắt (kỳ ngày / tuần). */
export async function aiWindow(tx: Tx, authz0: AuthzContext, { from, to }: { from: Date; to: Date }): Promise<DashboardDto['ai_today']> {
  const a = insightAuthz(authz0);
  const credits = can(a, 'agents.manage') || can(a, 'billing.manage');
  const [runs] = await tx.$queryRaw<{ runs: bigint; handoffs: bigint; credits: bigint }[]>`
    SELECT count(*) AS runs, count(*) FILTER (WHERE r.status = 'handoff') AS handoffs, coalesce(sum(r.credits_used), 0)::bigint AS credits
    FROM ai_run r LEFT JOIN conversation cv ON cv.id = r.conversation_id
    WHERE NOT r.dry_run AND r.started_at >= ${from} AND r.started_at < ${to}
      AND (${a.isOwner} OR r.initiated_by_user_id = ${a.userId}::uuid OR (cv.id IS NOT NULL AND ${can(a, 'inbox.view') ? convScopeSql(a) : Prisma.sql`false`}))`;
  const [acts] = await tx.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM action_log l WHERE l.created_at >= ${from} AND l.created_at < ${to} AND l.status = 'succeeded'
      AND l.source IN ('assistant', 'agent', 'task') AND (${a.isOwner} OR l.on_behalf_of_user_id = ${a.userId}::uuid)`;
  return { runs: Number(runs?.runs ?? 0n), actions: Number(acts?.n ?? 0n), handoffs: Number(runs?.handoffs ?? 0n), credits: credits ? Number(runs?.credits ?? 0n) : null };
}

/** 4 thẻ thống kê nhanh — số thật trong ngày workspace. */
export async function statsBlock(tx: Tx, authz0: AuthzContext, now: Date, place: Place, ai: DashboardDto['ai_today'], approvals: number): Promise<DashboardDto['stats']> {
  const a = insightAuthz(authz0);
  const m = serverMessages(place.locale).insights.stats;
  const f = createFmt({ locale: place.locale, timeZone: place.timeZone });
  const { from, to } = dayBounds(now, place.timeZone);
  const inbox = can(a, 'inbox.view') && (a.isOwner || a.scope.inbox !== 'none');
  const [conv] = inbox
    ? await tx.$queryRaw<{ n: bigint; waiting: bigint }[]>`
        SELECT count(*) AS n, count(*) FILTER (WHERE cv.ai_state = 'handoff' AND cv.status <> 'closed') AS waiting FROM conversation cv
        WHERE cv.last_message_at >= ${from} AND cv.last_message_at < ${to} AND cv.archived_at IS NULL AND ${convScopeSql(a)}`
    : [];
  const [run] = await tx.$queryRaw<{ running: bigint; done: bigint; turns: bigint }[]>`
    SELECT count(*) FILTER (WHERE r.status IN ('queued', 'running')) AS running,
           count(*) FILTER (WHERE r.kind = 'agent_reply' AND r.status = 'completed') AS done,
           count(*) FILTER (WHERE r.kind = 'agent_reply' AND r.status IN ('completed', 'handoff')) AS turns
    FROM ai_run r LEFT JOIN conversation cv ON cv.id = r.conversation_id
    WHERE NOT r.dry_run AND r.started_at >= ${from} AND r.started_at < ${to}
      AND (${a.isOwner} OR r.initiated_by_user_id = ${a.userId}::uuid OR (cv.id IS NOT NULL AND ${inbox ? convScopeSql(a) : Prisma.sql`false`}))`;
  // Thao tác Trợ lý / agent / tác vụ hôm nay của chính người xem (Owner: cả workspace) — lỗi / đã hoàn tác đếm từ action_log thật.
  const [act] = await tx.$queryRaw<{ failed: bigint; undone: bigint }[]>`
    SELECT count(*) FILTER (WHERE l.status = 'failed') AS failed, count(*) FILTER (WHERE l.status = 'undone') AS undone FROM action_log l
    WHERE l.created_at >= ${from} AND l.created_at < ${to} AND l.source IN ('assistant', 'agent', 'task')
      AND (${a.isOwner} OR l.on_behalf_of_user_id = ${a.userId}::uuid)`;
  const turns = Number(run?.turns ?? 0n);
  return [
    { label: m.conversations, value: inbox ? f.number(Number(conv?.n ?? 0n)) : '—', tone: 'up', note: inbox ? interpolate(m.conversationsNote, { n: Number(conv?.waiting ?? 0n) }) : '', icon: 'ic-mail' },
    { label: m.runs, value: f.number(ai.runs), tone: 'warn', note: interpolate(m.runsNote, { running: Number(run?.running ?? 0n), approvals }), icon: 'ic-send' },
    { label: m.actions, value: f.number(ai.actions), tone: 'muted', note: interpolate(m.actionsNote, { failed: Number(act?.failed ?? 0n), undone: Number(act?.undone ?? 0n) }), icon: 'ic-cog' },
    { label: m.auto, value: turns ? `${Math.round((Number(run?.done ?? 0n) / turns) * 100)}%` : '—', tone: 'up', note: m.autoNote, icon: 'ic-shield' },
  ];
}

const TONE: Record<string, string> = { warn: '#C9820B', danger: '#DC2626', info: '#2563EB', teal: '#0E9B94' };

/** Kênh vào (tài khoản kênh thật — số hội thoại 7 ngày trong scope) + hệ thống doanh nghiệp (kết nối tích hợp thật). Kênh gửi ra / nền dữ liệu
 *  chỉ là danh mục tĩnh của sản phẩm (không chỉ số). */
export async function connectBlock(tx: Tx, authz0: AuthzContext, now: Date, place: Place, catalog: { out: string[]; data: string[] }): Promise<DashboardDto['connect_groups']> {
  const a = insightAuthz(authz0);
  const m = serverMessages(place.locale);
  const f = createFmt({ locale: place.locale, timeZone: place.timeZone });
  const inbox = can(a, 'inbox.view') && (a.isOwner || a.scope.inbox !== 'none');
  const since = new Date(now.getTime() - 7 * DAY);
  const [accounts, counts, integrations] = await Promise.all([
    tx.channelAccount.findMany({ where: { status: { not: 'disconnected' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 12, select: { id: true, type: true, name: true, status: true } }),
    inbox
      ? tx.$queryRaw<{ id: string; n: bigint }[]>`
          SELECT cv.channel_account_id AS id, count(*) AS n FROM conversation cv
          WHERE cv.last_message_at >= ${since} AND cv.archived_at IS NULL AND ${convScopeSql(a)} GROUP BY cv.channel_account_id`
      : Promise.resolve([] as { id: string; n: bigint }[]),
    can(a, 'integrations.manage') || a.isOwner
      ? tx.integrationConnection.findMany({ where: { status: { not: 'disconnected' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 12, select: { name: true, status: true } })
      : Promise.resolve([] as { name: string; status: string }[]),
  ]);
  const n = new Map(counts.map((c) => [c.id, Number(c.n)]));
  const names = m.channels.name as Record<string, string>;
  return [
    { key: 'in', items: accounts.map((c) => ({ name: c.name || names[c.type] || c.type, meta: c.status === 'connected' ? (inbox ? f.compact(n.get(c.id) ?? 0) : m.insights.connect.connected) : m.insights.connect.error, warn: c.status !== 'connected' })) },
    { key: 'out', items: catalog.out.map((name) => ({ name, meta: '', warn: false })) },
    { key: 'erp', items: integrations.map((i) => ({ name: i.name, meta: i.status === 'connected' ? m.insights.connect.connected : m.insights.connect.error, warn: i.status !== 'connected' })) },
    { key: 'data', items: catalog.data.map((name) => ({ name, meta: '', warn: false })) },
  ];
}

const ROLE_ICON: Record<string, string> = { sales: 'ic-cart', marketing: 'ic-mega', cs: 'ic-users', ops: 'ic-cog', booking: 'ic-cal', accounting: 'ic-dollar', custom: 'ic-spark' };

/** Thẻ agent: agent thật (chưa xoá) — phiên 7 ngày = lượt agent_reply không dry-run, % auto = completed / (completed + handoff) (cùng định
 *  nghĩa thống kê agent); không có lượt → "chưa có dữ liệu" (không 0 giả). Đếm theo scope inbox người xem. */
export async function agentsBlock(tx: Tx, authz0: AuthzContext, now: Date, place: Place): Promise<DashboardDto['agents']> {
  const a = insightAuthz(authz0);
  const m = serverMessages(place.locale).insights.agents;
  const f = createFmt({ locale: place.locale, timeZone: place.timeZone });
  const agents = await tx.aiAgent.findMany({ where: { deletedAt: null, status: { not: 'draft' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 6, select: { id: true, name: true, role: true, roleLabel: true, persona: true, status: true } });
  if (!agents.length) return [];
  const inbox = can(a, 'inbox.view') && (a.isOwner || a.scope.inbox !== 'none');
  const since = new Date(now.getTime() - 7 * DAY);
  const rows = inbox
    ? await tx.$queryRaw<{ id: string; n: bigint; done: bigint; den: bigint }[]>`
        SELECT r.agent_id AS id, count(*) AS n, count(*) FILTER (WHERE r.status = 'completed') AS done, count(*) FILTER (WHERE r.status IN ('completed', 'handoff')) AS den
        FROM ai_run r JOIN conversation cv ON cv.id = r.conversation_id
        WHERE r.agent_id = ANY(${agents.map((x) => x.id)}) AND r.kind = 'agent_reply' AND NOT r.dry_run AND r.started_at >= ${since} AND ${convScopeSql(a)}
        GROUP BY r.agent_id`
    : [];
  const by = new Map(rows.map((r) => [r.id, r]));
  return agents.map((x) => {
    const r = by.get(x.id);
    const den = Number(r?.den ?? 0n);
    return {
      icon: ROLE_ICON[x.role] ?? 'ic-spark',
      name: x.name,
      status: x.status === 'active' ? 'active' : 'paused',
      desc: x.roleLabel || x.persona.slice(0, 80),
      sessions: r ? interpolate(m.sessions, { n: f.compact(Number(r.n)) }) : m.noData,
      auto: den ? interpolate(m.auto, { n: Math.round((Number(r!.done) / den) * 100) }) : '—',
    };
  });
}

/** 5 thông báo gần nhất của CHÍNH người xem (kênh trong app). */
export async function notificationsBlock(tx: Tx, userId: string, now: Date, place: Place, kinds: Record<string, { icon: string; tone: string }>): Promise<DashboardDto['notifications']> {
  const f = createFmt({ locale: place.locale, timeZone: place.timeZone });
  const rows = await tx.notification.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5, select: { type: true, title: true, readAt: true, createdAt: true } });
  return rows.map((r) => {
    const k = kinds[r.type];
    return { icon: k?.icon ?? 'ic-bell', color: TONE[k?.tone ?? 'info']!, text: r.title, time: f.relative(r.createdAt, now.getTime()), unread: !r.readAt };
  });
}
