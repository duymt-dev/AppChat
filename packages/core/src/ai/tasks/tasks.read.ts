// Màn Tác vụ tự chủ (`GET /v1/ai-tasks` — shape packages/shared/src/api/ai-tasks.ts, FE AiTasksPayload): thẻ tác vụ (lượt chạy 24h,
// tỉ lệ thành công, credit hôm nay, ngưỡng bàn giao = ngưỡng của agent), 6 chỉ số, mẫu nhanh (mẫu chủ động §5.4), phòng ban, nhóm dữ
// liệu / công cụ (key — FE dịch), agent chọn được, drawer theo tác vụ (công cụ agent chỉ xem — D51, kiến thức, nhật ký lượt chạy).
// Tác vụ ít (≤ vài chục / workspace) — không phân trang; thống kê gom một truy vấn theo `ai_run_task_idx`.
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import {
  AI_TASK_DATA_KEYS,
  AI_TASK_TEMPLATES,
  AI_TASK_TEMPLATE_DEFS,
  AI_TASK_TOOL_KEYS,
  interpolate,
  serverMessages,
  utcToWall,
  wallToUtc,
  type AiTaskRowDto,
  type AiTasksPayloadDto,
  type AiTierKey,
} from '@appchat/shared';
import { CREDIT_VND } from '../../billing/public';
import type { Place } from './task-place';

const DEPARTMENTS = [
  { key: 'Marketing', bg: '#EDE9FC', fg: '#6E48E6' },
  { key: 'Kinh doanh', bg: '#EDFAF3', fg: '#157A40' },
  { key: 'CSKH', bg: '#E7F0FF', fg: '#2563EB' },
  { key: 'Vận hành', bg: '#FFF4E5', fg: '#B45309' },
  { key: 'Tài chính', bg: '#FEF2F2', fg: '#B91C1C' },
];
const STAT_LOOK = [
  { key: 'total', color: '#2563EB', icon: 'ic-bot' },
  { key: 'active', color: '#16A34A', icon: 'ic-check' },
  { key: 'runs', color: '#6E48E6', icon: 'ic-flow' },
  { key: 'auto', color: '#0E9B94', icon: 'ic-spark' },
  { key: 'tokens', color: '#C8820B', icon: 'ic-gift' },
  { key: 'attention', color: '#DC2626', icon: 'ic-bell' },
];
const LOG_COLOR: Record<string, string> = { completed: '#16A34A', waiting_approval: '#C8820B', failed: '#DC2626', handoff: '#C8820B', cancelled: '#6B7280', running: '#2563EB', queued: '#2563EB' };
const LOGS_PER_TASK = 8;
const DAY = 86_400_000;

const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace('.', ',')}tr` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const vnd = (credits: number) => `${short(credits * CREDIT_VND)}₫`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

type Stat = { task_id: string; runs: number; ok: number; credits: number; today_credits: number; tokens: number };

/** `createdBy` = chỉ tác vụ của người này (vai trò không xem toàn workspace). */
export async function listAiTasks(db: TenantDb, place: Place, now: Date, createdBy?: string): Promise<AiTasksPayloadDto> {
  const m = serverMessages(place.locale).tasks;
  const since = new Date(now.getTime() - DAY);
  const today = wallToUtc(utcToWall(now, place.timeZone).date, '00:00', place.timeZone);
  const [tasks, agents, attention] = await Promise.all([
    db.aiTask.findMany({ where: { deletedAt: null, ...(createdBy ? { createdByUserId: createdBy } : {}) }, orderBy: { createdAt: 'desc' }, take: 200 }),
    db.aiAgent.findMany({ where: { deletedAt: null }, select: { id: true, name: true, status: true, publishedVersion: true, toolIds: true, confidenceThreshold: true, kbScope: true } }),
    db.aiRun.count({ where: { taskId: { not: null }, status: 'waiting_approval', ...(createdBy ? { initiatedByUserId: createdBy } : {}) } }),
  ]);
  const ids = tasks.map((t) => t.id);
  const stats = ids.length
    ? await db.$queryRaw<Stat[]>`
        SELECT r.task_id, count(*) FILTER (WHERE r.started_at >= ${since})::int AS runs,
               count(*) FILTER (WHERE r.started_at >= ${since} AND r.status = 'completed')::int AS ok,
               coalesce(sum(r.credits_used) FILTER (WHERE r.started_at >= ${since}), 0)::int AS credits,
               coalesce(sum(r.credits_used) FILTER (WHERE r.started_at >= ${today}), 0)::int AS today_credits,
               coalesce((SELECT sum(s.tokens_in + s.tokens_out) FROM ai_run_step s WHERE s.run_id = ANY(array_agg(r.id) FILTER (WHERE r.started_at >= ${today}))), 0)::int AS tokens
        FROM ai_run r WHERE r.task_id IN (${Prisma.join(ids)}) AND r.started_at >= ${since}
        GROUP BY r.task_id`
    : [];
  const byTask = new Map(stats.map((s) => [s.task_id, s]));
  const agentOf = new Map(agents.map((a) => [a.id, a]));
  const rows: AiTaskRowDto[] = tasks.map((t) => {
    const s = byTask.get(t.id);
    const a = t.agentId ? agentOf.get(t.agentId) : undefined;
    return {
      id: t.id,
      name: t.name,
      role: t.goal.length > 60 ? `${t.goal.slice(0, 60)}…` : t.goal,
      goal: t.goal,
      prompt: t.prompt,
      runs: s?.runs ?? 0,
      success: pct(s?.ok ?? 0, s?.runs ?? 0),
      cost: vnd(s?.today_credits ?? 0),
      active: t.status === 'active',
      model_tier: t.modelTier as AiTierKey,
      department: t.department,
      channels: t.template === 'briefing' || !t.toolIds.includes('message') ? [m.channelInternal] : ['Zalo cá nhân', 'Email'].slice(0, t.toolIds.includes('email') ? 2 : 1),
      conf: a?.confidenceThreshold ?? 70,
      trigger: t.trigger,
      cron: t.cron,
      event_type: t.eventType,
      template: t.template,
      agent_id: t.agentId,
      agent_name: a?.name ?? '',
      data_scope: t.dataScope,
      tools: t.toolIds,
      ask_before_send: t.askBeforeSend,
      credit_limit_per_run: t.creditLimitPerRun,
      next_run_at: t.nextRunAt?.toISOString() ?? null,
      last_run_at: t.lastRunAt?.toISOString() ?? null,
    };
  });
  const runs = stats.reduce((x, s) => x + s.runs, 0);
  const ok = stats.reduce((x, s) => x + s.ok, 0);
  const tokens = stats.reduce((x, s) => x + s.tokens, 0);
  const value: Record<string, string> = {
    total: String(rows.length),
    active: `${rows.filter((r) => r.active).length}/${rows.length}`,
    runs: runs.toLocaleString('vi-VN'),
    auto: pct(ok, runs),
    tokens: short(tokens),
    attention: String(attention),
  };
  const drawers = await drawersOf(db, tasks, agentOf, place, today);
  return {
    tasks: rows,
    stats: STAT_LOOK.map((s) => ({ ...s, value: value[s.key]! })),
    templates: AI_TASK_TEMPLATES.map((k) => {
      const tp = m.template[k];
      return { label: tp.label, name: tp.name, goal: interpolate(tp.goal, AI_TASK_TEMPLATE_DEFS[k].params), department: AI_TASK_TEMPLATE_DEFS[k].department, template: k };
    }),
    departments: DEPARTMENTS,
    data_options: [...AI_TASK_DATA_KEYS],
    tool_options: [...AI_TASK_TOOL_KEYS],
    agents: agents.filter((a) => a.status === 'active' && a.publishedVersion > 0).map((a) => ({ id: a.id, name: a.name })),
    drawers,
    drawer: { prompt: m.defaultPrompt, tokens: '0', tools: [], knowledge: [], logs: [] },
  };
}

type AgentLite = { id: string; name: string; toolIds: string[]; kbScope: unknown };

async function drawersOf(db: TenantDb, tasks: { id: string; agentId: string | null; prompt: string }[], agentOf: Map<string, AgentLite>, place: Place, today: Date): Promise<AiTasksPayloadDto['drawers']> {
  if (!tasks.length) return {};
  const m = serverMessages(place.locale).tasks.log;
  const [runs, folders] = await Promise.all([
    db.$queryRaw<{ id: string; task_id: string; title: string; status: string; credits_used: number; started_at: Date; error: string | null }[]>`
      SELECT x.id, x.task_id, x.title, x.status::text, x.credits_used, x.started_at, x.error FROM (
        SELECT r.*, row_number() OVER (PARTITION BY r.task_id ORDER BY r.started_at DESC) AS n
        FROM ai_run r WHERE r.task_id IN (${Prisma.join(tasks.map((t) => t.id))})) x
      WHERE x.n <= ${LOGS_PER_TASK} ORDER BY x.started_at DESC`,
    db.kbFolder.findMany({ select: { id: true, name: true, _count: { select: { sources: true } } } }).catch(() => [] as { id: string; name: string; _count: { sources: number } }[]),
  ]);
  const tokens = await db.$queryRaw<{ task_id: string; t: number }[]>`
    SELECT r.task_id, coalesce(sum(s.tokens_in + s.tokens_out), 0)::int AS t FROM ai_run r JOIN ai_run_step s ON s.run_id = r.id
    WHERE r.task_id IN (${Prisma.join(tasks.map((t) => t.id))}) AND r.started_at >= ${today} GROUP BY r.task_id`;
  const tok = new Map(tokens.map((x) => [x.task_id, x.t]));
  const out: AiTasksPayloadDto['drawers'] = {};
  for (const t of tasks) {
    const a = t.agentId ? agentOf.get(t.agentId) : undefined;
    const kb = ((a?.kbScope ?? {}) as { folder_ids?: string[] }).folder_ids ?? [];
    out[t.id] = {
      prompt: t.prompt,
      tokens: short(tok.get(t.id) ?? 0),
      // Nhãn = action id (FE dịch theo `actions.<id>.title`); `on` = còn dùng được trong tác vụ (nằm trong quyền đã cấp của agent).
      tools: (a?.toolIds ?? []).map((id) => ({ label: id, on: true })),
      knowledge: folders.map((f) => ({ label: f.name, meta: String(f._count.sources), on: kb.includes(f.id) })),
      logs: runs
        .filter((r) => r.task_id === t.id)
        .map((r) => ({ time: utcToWall(r.started_at, place.timeZone).hm, text: `${m[r.status as keyof typeof m] ?? r.status}${r.credits_used ? ` · ${r.credits_used} credit` : ''}${r.status === 'failed' && r.error && !/^[A-Z_]+:/.test(r.error) ? ` · ${r.error.slice(0, 80)}` : ''}`, color: LOG_COLOR[r.status] ?? '#6B7280' })),
    };
  }
  return out;
}
