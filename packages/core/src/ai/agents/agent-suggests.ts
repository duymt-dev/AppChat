// Gợi ý Trợ lý trong drawer "Trợ lý AI" của màn AI Agents (prototype L2581, `GET /v1/agents/meta.ai_suggests`) — tính từ dữ liệu
// thật của workspace thay chữ mẫu prototype: agent tự xử lý thấp nhất (≥ 5 lượt có kết luận), số agent đang chạy + có từ khoá ưu
// tiên, lượt agent trực kênh hôm nay (giờ VN) + tỉ lệ chuyển người. Chưa có dữ liệu → câu hướng dẫn. `ask` = câu hỏi gửi sang Trợ lý.
import { interpolate, serverMessages } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';

const COLORS = { create: '#2DC56A', optimize: '#6E48E6', routing: '#2563EB', report: '#157A40' } as const;
const MIN_RUNS = 5;
const VN_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 86_400_000;

export interface AgentSuggest {
  key: keyof typeof COLORS;
  color: string;
  title: string;
  desc: string;
  ask?: string;
}

type Db = Pick<TenantDb, 'aiAgent' | '$queryRaw'>;

export async function agentSuggests(db: Db, now: Date, locale = 'vi'): Promise<AgentSuggest[]> {
  const m = serverMessages(locale).ai.suggest;
  const live = await db.aiAgent.findMany({ where: { deletedAt: null, status: 'active' }, select: { id: true, name: true, keywords: true } });
  const ids = live.map((a) => a.id);
  const rates = ids.length
    ? await db.$queryRaw<{ agent_id: string; done: bigint; handoff: bigint }[]>`
        SELECT agent_id, count(*) FILTER (WHERE status = 'completed') AS done, count(*) FILTER (WHERE status = 'handoff') AS handoff
        FROM ai_run WHERE agent_id = ANY(${ids}) AND kind = 'agent_reply' AND NOT dry_run GROUP BY agent_id`
    : [];
  const worst = rates
    .map((r) => ({ id: r.agent_id, n: Number(r.done) + Number(r.handoff), rate: Number(r.done) / Math.max(1, Number(r.done) + Number(r.handoff)) }))
    .filter((r) => r.n >= MIN_RUNS)
    .sort((a, b) => a.rate - b.rate)[0];
  const worstName = worst ? (live.find((a) => a.id === worst.id)?.name ?? '') : '';
  const from = new Date(Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS);
  const [today] = await db.$queryRaw<{ n: bigint; handoff: bigint }[]>`
    SELECT count(*) AS n, count(*) FILTER (WHERE status = 'handoff') AS handoff
    FROM ai_run WHERE kind = 'agent_reply' AND NOT dry_run AND started_at >= ${from}`;
  const n = Number(today?.n ?? 0);
  const kw = live.filter((a) => a.keywords.length).length;
  return [
    { key: 'create', color: COLORS.create, title: m.create.title, desc: m.create.desc },
    {
      key: 'optimize',
      color: COLORS.optimize,
      title: m.optimize.title,
      desc: worst ? interpolate(m.optimize.desc, { name: worstName, rate: Math.round(worst.rate * 100) }) : m.optimize.empty,
      ask: interpolate(m.ask.optimize, { name: worstName || live[0]?.name || '' }),
    },
    { key: 'routing', color: COLORS.routing, title: m.routing.title, desc: live.length ? interpolate(m.routing.desc, { n: live.length, kw }) : m.routing.empty, ask: m.ask.routing },
    {
      key: 'report',
      color: COLORS.report,
      title: m.report.title,
      desc: n ? interpolate(m.report.desc, { n, handoff: Math.round((Number(today?.handoff ?? 0) / n) * 100) }) : m.report.empty,
      ask: m.ask.report,
    },
  ];
}
