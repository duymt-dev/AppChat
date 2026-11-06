// Thống kê AI Agent có nguồn (TIP-038 mục 2, REQ-D14b): mọi chỉ số tính trên dữ liệu người xem được đọc (scope insights ∩ scope domain),
// thiếu quyền nguồn / thiếu mẫu → `available: false` + lý do (không 0 giả).
//   conversations — hội thoại khác nhau có lượt `agent_reply` không dry-run trong kỳ (n = số lượt).
//   resolve_rate  — tỷ lệ LƯỢT tự xử lý = completed / (completed + handoff) — không đổi thành tỷ lệ khách.
//   csat          — TB `ticket.csat` của ticket GIAO cho agent (assignee_agent_id), đóng trong kỳ; n = số ticket có điểm.
//   close_rate    — tương quan: khách có hội thoại agent phục vụ trong kỳ → % có đơn hoàn tất trong kỳ (mỗi khách một lần).
//   credits       — Credit đã trừ thật ghi ở run (`ai_run.credits_used` — CreditMeter thanh toán từng bước), không dry-run / ước lượng.
//   human         — cùng định nghĩa cho người thật: ticket giao cho người (không agent); khách chỉ có người phản hồi (không lượt agent nào).
// Index (migration 20261102003800_insights): `ai_run_agent_reply_idx (agent_id, started_at)` partial agent_reply ∧ ¬dry_run INCLUDE
// (conversation_id, status, credits_used); `ticket_agent_closed_idx (assignee_agent_id, closed_at)`; `ticket_closed_idx (closed_at)`.
import { TenantSql as Prisma } from '@appchat/db';
import { can, type AgentStatsDto, type AuthzContext, type StatValueDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { convScopeSql } from '../../inbox/services/access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { supportScopeSql } from '../../support/ticket-access';
import { insightAuthz, sourceDenial, type MetricWindow } from '../metrics/common';

type Tx = Pick<TenantTx, '$queryRaw'>;

const stat = (value: number | null, n: number, reason?: string): StatValueDto =>
  reason ? { value: null, n: 0, available: false, reason } : n ? { value, n, available: true } : { value: null, n: 0, available: false, reason: 'no_samples' };
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 1000) / 10 : null);
const avg = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);

const RUN = (w: MetricWindow) => Prisma.sql`r.kind = 'agent_reply' AND NOT r.dry_run AND r.started_at >= ${w.fromUtc} AND r.started_at < ${w.toUtc}`;
const DONE_IN = (w: MetricWindow, a: AuthzContext) =>
  Prisma.sql`EXISTS (SELECT 1 FROM "order" o WHERE o.contact_id = c.contact_id AND o.status = 'completed' AND o.deleted_at IS NULL
    AND o.completed_at >= ${w.fromUtc} AND o.completed_at < ${w.toUtc} AND ${orderScopeSql(a)})`;

interface RunRow { agent_id: string; conv: bigint; runs: bigint; completed: bigint; handoff: bigint }
interface Rated { id: string; avg: number | null; n: bigint }
interface Cohort { id: string; n: bigint; won: bigint }

async function runs(tx: Tx, a: AuthzContext, w: MetricWindow, ids: string[]) {
  return tx.$queryRaw<RunRow[]>`
    SELECT r.agent_id, count(DISTINCT r.conversation_id) AS conv, count(*) AS runs,
           count(*) FILTER (WHERE r.status = 'completed') AS completed, count(*) FILTER (WHERE r.status = 'handoff') AS handoff
    FROM ai_run r JOIN conversation cv ON cv.id = r.conversation_id
    WHERE r.agent_id = ANY(${ids}) AND ${RUN(w)} AND ${convScopeSql(a)} GROUP BY r.agent_id`;
}

async function csat(tx: Tx, a: AuthzContext, w: MetricWindow, ids: string[]) {
  return tx.$queryRaw<Rated[]>`
    SELECT t.assignee_agent_id::text AS id, avg(t.csat)::float8 AS avg, count(*) AS n FROM ticket t
    WHERE t.assignee_agent_id = ANY(${ids}::uuid[]) AND t.closed_at >= ${w.fromUtc} AND t.closed_at < ${w.toUtc} AND t.csat IS NOT NULL
      AND ${supportScopeSql(a)} GROUP BY t.assignee_agent_id`;
}

async function closeRate(tx: Tx, a: AuthzContext, w: MetricWindow, ids: string[]) {
  return tx.$queryRaw<Cohort[]>`
    WITH c AS (
      SELECT DISTINCT r.agent_id, cv.contact_id FROM ai_run r JOIN conversation cv ON cv.id = r.conversation_id
      WHERE r.agent_id = ANY(${ids}) AND ${RUN(w)} AND cv.contact_id IS NOT NULL AND ${convScopeSql(a)})
    SELECT c.agent_id AS id, count(*) AS n, count(*) FILTER (WHERE ${DONE_IN(w, a)}) AS won FROM c GROUP BY c.agent_id`;
}

async function credits(tx: Tx, w: MetricWindow, ids: string[]) {
  return tx.$queryRaw<{ id: string; credits: bigint; n: bigint }[]>`
    SELECT r.agent_id AS id, coalesce(sum(r.credits_used), 0)::bigint AS credits, count(*) AS n FROM ai_run r
    WHERE r.agent_id = ANY(${ids}) AND ${RUN(w)} GROUP BY r.agent_id`;
}

/** So sánh người thật (cùng kỳ / định nghĩa) — tách khách có lượt agent (mixed) ra khỏi nhóm người thật. */
async function human(tx: Tx, a: AuthzContext, w: MetricWindow, deny: { support: string | null; close: string | null }) {
  const [rated] = deny.support ? [] : await tx.$queryRaw<{ avg: number | null; n: bigint }[]>`
    SELECT avg(t.csat)::float8 AS avg, count(*) AS n FROM ticket t
    WHERE t.closed_at >= ${w.fromUtc} AND t.closed_at < ${w.toUtc} AND t.csat IS NOT NULL AND t.assignee_agent_id IS NULL
      AND t.assignee_user_id IS NOT NULL AND ${supportScopeSql(a)}`;
  const [cohort] = deny.close ? [] : await tx.$queryRaw<{ n: bigint; won: bigint }[]>`
    WITH c AS (
      SELECT DISTINCT cv.contact_id FROM conversation cv
      WHERE cv.last_message_at >= ${w.fromUtc} AND cv.contact_id IS NOT NULL AND ${convScopeSql(a)}
        AND EXISTS (SELECT 1 FROM message m WHERE m.conversation_id = cv.id AND m.direction = 'out' AND m.sender_type = 'user'
                    AND m.created_at >= ${w.fromUtc} AND m.created_at < ${w.toUtc})
        AND NOT EXISTS (SELECT 1 FROM ai_run r JOIN conversation x ON x.id = r.conversation_id WHERE x.contact_id = cv.contact_id AND ${RUN(w)}))
    SELECT count(*) AS n, count(*) FILTER (WHERE ${DONE_IN(w, a)}) AS won FROM c`;
  return {
    csat: deny.support ? stat(null, 0, deny.support) : stat(avg(rated?.avg ?? null), Number(rated?.n ?? 0)),
    close_rate: deny.close ? stat(null, 0, deny.close) : stat(pct(Number(cohort?.won ?? 0), Number(cohort?.n ?? 0)), Number(cohort?.n ?? 0)),
  };
}

/** Thống kê nhiều agent một lượt (mỗi chỉ số một truy vấn GROUP BY — không N+1). */
export async function agentStats(tx: Tx, authz: AuthzContext, w: MetricWindow, ids: string[]): Promise<Map<string, AgentStatsDto>> {
  const a = insightAuthz(authz);
  const deny = {
    inbox: sourceDenial(a, ['inbox.view'], 'inbox'),
    support: sourceDenial(a, ['ticket.view'], 'support'),
    close: sourceDenial(a, ['inbox.view'], 'inbox') ?? sourceDenial(a, ['order.view'], 'sales'),
    // Credit của agent: người quản lý agent / ví (không mở ví cho người thiếu quyền — chỉ số Credit theo run, không số dư).
    credits: can(a, 'agents.manage') || can(a, 'billing.manage') ? null : 'permission:agents.manage',
  };
  const [r, c, k, cr, h] = await Promise.all([
    deny.inbox || !ids.length ? [] : runs(tx, a, w, ids),
    deny.support || !ids.length ? [] : csat(tx, a, w, ids),
    deny.close || !ids.length ? [] : closeRate(tx, a, w, ids),
    deny.credits || !ids.length ? [] : credits(tx, w, ids),
    human(tx, a, w, deny),
  ]);
  const by = <T extends { id?: string; agent_id?: string }>(rows: T[]) => new Map(rows.map((x) => [(x.id ?? x.agent_id)!, x]));
  const [R, C, K, CR] = [by(r), by(c), by(k), by(cr)];
  const window = { from: w.from, to: w.to, timezone: w.timezone };
  return new Map(
    ids.map((id) => {
      const run = R.get(id);
      const done = Number(run?.completed ?? 0);
      const den = done + Number(run?.handoff ?? 0);
      const rated = C.get(id);
      const co = K.get(id);
      const used = CR.get(id);
      return [
        id,
        {
          agent_id: id,
          window,
          conversations: deny.inbox ? stat(null, 0, deny.inbox) : { value: Number(run?.conv ?? 0), n: Number(run?.runs ?? 0), available: true },
          resolve_rate: deny.inbox ? stat(null, 0, deny.inbox) : stat(pct(done, den), den),
          csat: deny.support ? stat(null, 0, deny.support) : stat(avg(rated?.avg ?? null), Number(rated?.n ?? 0)),
          close_rate: deny.close ? stat(null, 0, deny.close) : stat(pct(Number(co?.won ?? 0), Number(co?.n ?? 0)), Number(co?.n ?? 0)),
          credits: deny.credits ? stat(null, 0, deny.credits) : stat(Number(used?.credits ?? 0), Number(used?.n ?? 0)),
          human: h,
        },
      ];
    }),
  );
}

