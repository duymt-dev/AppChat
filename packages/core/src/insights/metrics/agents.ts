// agents.performance (TIP-038 mục 1–2): mỗi agent (chưa xoá, ≤ 100) một dòng — cùng service `agent-stats.ts` với GET /v1/agents/:id/stats,
// nên số liệu thẻ / chi tiết / Trợ lý khớp nhau. Chỉ số người xem thiếu quyền nguồn → ô `null` + nguồn ghi ở `availability.excluded`.
import { INSIGHT_LIMITS, type AgentStatsDto, type StatValueDto } from '@appchat/shared';
import { agentStats } from '../services/agent-stats';
import type { MetricBody, MetricCtx } from './common';

const COLUMNS: MetricBody['columns'] = [
  { key: 'agent', format: 'text' },
  { key: 'conversations', format: 'number' },
  { key: 'resolve_rate', format: 'percent' },
  { key: 'csat', format: 'number' },
  { key: 'csat_n', format: 'number' },
  { key: 'close_rate', format: 'percent' },
  { key: 'credits', format: 'number' },
];
const KEYS = ['conversations', 'resolve_rate', 'csat', 'close_rate', 'credits'] as const;

const v = (s: StatValueDto) => (s.available ? s.value : null);

export async function agentsPerformance(c: MetricCtx, agentId?: string): Promise<MetricBody> {
  const agents = await c.tx.aiAgent.findMany({
    where: { deletedAt: null, ...(agentId ? { id: agentId } : {}) },
    select: { id: true, name: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: INSIGHT_LIMITS.maxRows,
  });
  const stats = await agentStats(c.tx, c.authz, c.window, agents.map((a) => a.id));
  const first = stats.values().next().value as AgentStatsDto | undefined;
  // Lý do loại nguồn giống nhau cho mọi agent (theo quyền người xem) → đọc ở dòng đầu.
  const excluded = first ? KEYS.flatMap((k) => (first[k].available || first[k].reason === 'no_samples' || !first[k].reason ? [] : [{ source: k, reason: first[k].reason! }])) : [];
  const rows = agents.map((a) => {
    const s = stats.get(a.id)!;
    return { agent: a.name, agent_id: a.id, conversations: v(s.conversations), resolve_rate: v(s.resolve_rate), csat: v(s.csat), csat_n: s.csat.n, close_rate: v(s.close_rate), credits: v(s.credits) };
  });
  return {
    columns: COLUMNS,
    rows,
    chart: { kind: 'column', x: 'agent', y: 'conversations' },
    sources: [
      { type: 'ai_run', route: '/agents', ids: agents.map((a) => a.id), description: 'agent_reply runs (dry runs excluded); resolve rate = completed / (completed + handoff) turns' },
      { type: 'ticket', description: 'CSAT of tickets assigned to the agent and closed in the window' },
      { type: 'order', description: 'close rate is a correlation: served customers with a completed order in the window' },
    ],
    sample_count: rows.reduce((s, r) => s + (stats.get(r.agent_id)!.conversations.n ?? 0), 0),
    availability: { status: excluded.length ? (excluded.length === KEYS.length ? 'unavailable' : 'partial') : 'ok', excluded },
  };
}
