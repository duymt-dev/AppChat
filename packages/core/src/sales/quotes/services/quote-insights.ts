// Số liệu phụ của trang Báo giá từ dữ liệu thật: KPI + tỉ lệ chốt (toàn scope người xem), kết quả mẫu của panel Trợ lý AI · Báo giá
// (luật trên dữ liệu, không gọi LLM — chữ server i18n), và theo từng báo giá: thẻ CRM của khách, hoạt động, việc cần làm, lịch sử.
// Màu là dữ liệu hiển thị như fixture prototype (FE đặt vào style).
import { createFmt, interpolate, serverMessages, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { quoteScopeSql, type QuoteRecord } from '../quote-access';
import { staleSent, statusCounts } from '../repos/quotes.repo';

const FOLLOW_DAYS = 3;
const C = { green: '#16A34A', blue: '#2563EB', violet: '#6E48E6', amber: '#C9820B', zalo: '#0068FF', mint: '#2DC56A', gray: '#6B7280', ink: '#157A40', rose: '#DC2626' };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%');

export async function quoteKpis(tx: TenantTx, authz: AuthzContext) {
  const counts = await statusCounts(tx, authz);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const decided = (counts.accepted ?? 0) + (counts.rejected ?? 0) + (counts.expired ?? 0);
  return {
    counts: { all, ...counts },
    stats: { total: all, approved: counts.approved ?? 0, waiting: (counts.sent ?? 0) + (counts.viewed ?? 0), close_rate: pct(counts.accepted ?? 0, decided) },
    decided,
  };
}

export async function aiRuns(tx: TenantTx, authz: AuthzContext, k: Awaited<ReturnType<typeof quoteKpis>>, o: { locale: string; timeZone: string; now: Date }) {
  const m = serverMessages(o.locale).sales.quote.runs;
  const fmt = createFmt(o);
  const counts = k.counts as Record<string, number>;
  const open = ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'revision_requested'].reduce((a, s) => a + (counts[s] ?? 0), 0);
  const top = await tx.$queryRaw<{ code: string; name: string; total: bigint; sum: bigint }[]>`
    SELECT q.code, c.name, q.total, sum(q.total) OVER () AS sum FROM quote q JOIN contact c ON c.id = q.contact_id
    WHERE q.deleted_at IS NULL AND q.status IN ('draft', 'pending_approval', 'approved', 'sent', 'viewed', 'revision_requested') AND ${quoteScopeSql(authz)}
    ORDER BY q.total DESC LIMIT 1`;
  const stale = await staleSent(tx, authz, new Date(o.now.getTime() - FOLLOW_DAYS * 86_400_000), 3);
  const t = top[0];
  return {
    sugg: open && t ? interpolate(m.sugg, { count: open, total: fmt.moneyShort(String(t.sum)), top: `${t.code} · ${t.name} · ${fmt.moneyShort(String(t.total))}` }) : m.suggEmpty,
    followup: stale.length ? interpolate(m.followup, { count: stale.length, list: `: ${stale.map((s) => `${s.code} · ${s.name}`).join(', ')}` }) : m.followupEmpty,
    analyze: k.decided
      ? interpolate(m.analyze, { rate: k.stats.close_rate, accepted: counts.accepted ?? 0, decided: k.decided, rejected: counts.rejected ?? 0, expired: counts.expired ?? 0 })
      : m.analyzeEmpty,
  };
}

/** Thẻ CRM / hoạt động / việc cần làm / lịch sử của MỘT báo giá (drawer). */
export async function quoteInsights(tx: TenantTx, q: QuoteRecord, o: { locale: string; timeZone: string; now: Date }) {
  const fmt = createFmt(o);
  const [contact, mine] = await Promise.all([
    tx.contact.findUnique({ where: { id: q.contactId }, select: { totalSpent: true } }),
    tx.quote.groupBy({ by: ['status'], where: { contactId: q.contactId, deletedAt: null, status: { not: 'superseded' } }, _count: { _all: true } }),
  ]);
  const by = Object.fromEntries(mine.map((r) => [r.status, r._count._all])) as Record<string, number>;
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const orders = await tx.quote.count({ where: { contactId: q.contactId, orderId: { not: null } } });
  const crm_stats: [string, string, string][] = [
    ['ltv', fmt.moneyShort(String(contact?.totalSpent ?? 0n)), C.green],
    ['orders', String(orders), C.blue],
    ['quotes', String(total), C.violet],
    ['close', pct(by.accepted ?? 0, (by.accepted ?? 0) + (by.rejected ?? 0) + (by.expired ?? 0)), C.amber],
  ];
  const timeline: [string, string, string, string][] = [['created', q.createdAt.toISOString(), C.gray, 'ic-doc']];
  if (q.sentAt) timeline.push([q.sentChannel === 'email' ? 'sentEmail' : 'sent', q.sentAt.toISOString(), C.zalo, q.sentChannel === 'email' ? 'ic-mail' : 'ic-inbox']);
  if (q.viewedAt) timeline.push(['viewed', q.viewedAt.toISOString(), C.violet, 'ic-mail']);
  if (q.decidedAt && (q.status === 'accepted' || q.status === 'rejected')) timeline.push([q.status, q.decidedAt.toISOString(), q.status === 'accepted' ? C.mint : C.rose, q.status === 'accepted' ? 'ic-check' : 'ic-x']);
  const when = (d: Date | null) => {
    if (!d) return 'none';
    const day = (x: Date) => fmt.date(x);
    if (day(d) === day(o.now)) return 'today';
    return day(d) === day(new Date(o.now.getTime() - 86_400_000)) ? 'yesterday' : 'none';
  };
  const todos: [string, boolean, string][] = [
    ['send', !!q.sentAt, when(q.sentAt)],
    ['price', q.status === 'accepted', when(q.status === 'accepted' ? q.decidedAt : null)],
    ['contract', !!q.orderId, 'none'],
  ];
  const history: [string, string][] = [['create', C.gray]];
  if (q.sentAt) history.push([q.sentChannel === 'email' ? 'sendEmail' : 'send', C.zalo]);
  if (q.viewedAt) history.push(['open', C.violet]);
  history.push(['current', C.ink]);
  return { crm_stats, timeline, todos, history };
}
