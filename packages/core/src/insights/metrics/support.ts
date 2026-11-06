// support.performance (TIP-038 mục 1): theo kỳ đóng ticket (closed_at, ngày workspace) — số ticket đóng, đạt SLA (`sla_result = met`), CSAT
// trung bình + số ticket có điểm (mẫu số rỗng → null). Nguồn: ticket.view + scope support (∩ insights). Index ticket_closed_idx (closed_at)
// partial closed_at IS NOT NULL — migration 20261102003800_insights.
import { supportScopeSql } from '../../support/ticket-access';
import { bucketsSql, insightAuthz, num, sourceDenial, unavailable, type MetricBody, type MetricCtx } from './common';

const COLUMNS: MetricBody['columns'] = [
  { key: 'period', format: 'date' },
  { key: 'closed', format: 'number' },
  { key: 'sla_met_rate', format: 'percent' },
  { key: 'csat', format: 'number' },
  { key: 'csat_n', format: 'number' },
];

interface Row { k: string; closed: bigint; met: bigint; judged: bigint; csat: number | null; csat_n: bigint }

export async function supportPerformance(c: MetricCtx): Promise<MetricBody> {
  const a = insightAuthz(c.authz);
  const deny = sourceDenial(a, ['ticket.view'], 'support');
  if (deny) return unavailable(COLUMNS, 'ticket', deny);
  const b = bucketsSql(c.window);
  const rows = await c.tx.$queryRaw<Row[]>`
    SELECT b.k, count(*) AS closed,
           count(*) FILTER (WHERE t.sla_result = 'met') AS met, count(*) FILTER (WHERE t.sla_result IS NOT NULL) AS judged,
           avg(t.csat)::float8 AS csat, count(t.csat) AS csat_n
    FROM ${b.sql} JOIN ticket t ON t.closed_at >= b.s AND t.closed_at < b.e WHERE ${supportScopeSql(a)}
    GROUP BY b.k`;
  const by = new Map(rows.map((r) => [r.k, r]));
  const out = b.keys.map((k) => {
    const r = by.get(k);
    const judged = num(r?.judged);
    return {
      period: k,
      closed: num(r?.closed),
      sla_met_rate: judged ? Math.round((num(r?.met) / judged) * 1000) / 10 : null,
      csat: r?.csat == null ? null : Math.round(r.csat * 100) / 100,
      csat_n: num(r?.csat_n),
    };
  });
  return {
    columns: COLUMNS,
    rows: out,
    chart: { kind: 'line', x: 'period', y: 'closed' },
    sources: [{ type: 'ticket', route: '/tickets', description: 'tickets closed in the window (workspace time): SLA result and CSAT' }],
    sample_count: out.reduce((s, r) => s + r.closed, 0),
    availability: { status: 'ok', excluded: [] },
  };
}
