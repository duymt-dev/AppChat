// Mock thống kê agent (TIP-038 mục 2): GET /agents/:id/stats?from&to — cùng schema `agentStatsSchema` với API thật. Số liệu dựng từ
// conversations / resolve_rate / csat của fixture agent (prototype); agent chưa có hội thoại → chỉ số `available: false` ("—"), không 0 giả.
import { ApiRequestError, type AgentStatsDto, type StatValueDto } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

const TZ = 'Asia/Ho_Chi_Minh';
const day = (d: Date) => d.toISOString().slice(0, 10);
const v = (value: number | null, n: number): StatValueDto => (n && value !== null ? { value, n, available: true } : { value: null, n: 0, available: false, reason: 'no_samples' });

type AgentRow = { id: string; conversations: number; resolve_rate: number; csat: number };

export function statsOf(a: AgentRow, p: { from?: unknown; to?: unknown } = {}): AgentStatsDto {
  const to = typeof p.to === 'string' ? p.to : day(new Date(Date.now() + 86_400_000));
  const from = typeof p.from === 'string' ? p.from : day(new Date(Date.parse(`${to}T00:00:00Z`) - 30 * 86_400_000));
  const conv = a.conversations;
  const turns = Math.round(conv * 1.3);
  const rated = a.csat ? Math.max(1, Math.round(conv / 12)) : 0;
  const cohort = Math.round(conv * 0.6);
  return {
    agent_id: a.id,
    window: { from, to, timezone: TZ },
    conversations: { value: conv, n: turns, available: true },
    resolve_rate: v(a.resolve_rate || null, turns),
    csat: v(a.csat || null, rated),
    close_rate: v(cohort ? Math.round((a.resolve_rate / 4) * 10) / 10 : null, cohort),
    credits: v(conv ? turns * 2 : null, turns),
    human: { csat: v(4.2, 18), close_rate: v(14.5, 40) },
  };
}

function mockAgentStats(db: MockDb, id: string, p: { from?: unknown; to?: unknown }): AgentStatsDto {
  const a = db.agents.agents.find((x) => x.id === id && !x.deleted);
  if (!a) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return statsOf(a, p);
}

export const agentStatsParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/agents\/([^/]+)\/stats$/);
  return m ? (db, p) => mockAgentStats(db, m[1]!, p) : undefined;
};
