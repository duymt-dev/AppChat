// Số liệu phụ trang Đơn hàng từ dữ liệu thật: chip + KPI (scope người xem), kết quả mẫu panel Trợ lý AI · Đơn hàng (luật trên dữ liệu,
// không gọi LLM — chữ server i18n), và theo từng đơn: thẻ CRM của khách (LTV, số đơn, hạng, điểm), nhận định, tệp liên quan.
import { createFmt, interpolate, serverMessages, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { orderScopeSql, type OrderRecord } from '../order-access';
import { chipCounts } from '../repos/orders.repo';

type Place = { locale: string; timeZone: string; now: Date };
const DAY = 86_400_000;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%');

export async function orderKpis(tx: TenantTx, authz: AuthzContext) {
  const { counts, revenue } = await chipCounts(tx, authz);
  return { counts, stats: { total: counts.all, paid: counts.paid, pending: counts.pending, revenue: String(revenue) } };
}

/** `all` = tổng đơn trong scope (KPI đã đếm). */
export async function orderRuns(tx: TenantTx, authz: AuthzContext, o: Place, all: number): Promise<Record<string, string>> {
  const m = serverMessages(o.locale).sales.order.runs;
  const fmt = createFmt(o);
  const scope = orderScopeSql(authz);
  const dayAgo = new Date(o.now.getTime() - DAY);
  const monthAgo = new Date(o.now.getTime() - 30 * DAY);
  const [waiting, cancelled, top, due, month] = await Promise.all([
    tx.$queryRaw<{ code: string; name: string }[]>`
      SELECT o.code, c.name FROM "order" o JOIN contact c ON c.id = o.contact_id
      WHERE o.deleted_at IS NULL AND o.status <> 'cancelled' AND o.pay_status = 'awaiting_deposit' AND o.created_at < ${dayAgo} AND ${scope}
      ORDER BY o.created_at LIMIT 3`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "order" o WHERE o.deleted_at IS NULL AND o.status = 'cancelled' AND o.cancelled_at >= ${monthAgo} AND ${scope}`,
    tx.$queryRaw<{ name: string; spent: bigint }[]>`
      SELECT c.name, sum(o.total)::bigint AS spent FROM "order" o JOIN contact c ON c.id = o.contact_id
      WHERE o.deleted_at IS NULL AND o.status = 'completed' AND o.completed_at >= ${new Date(o.now.getTime() - 90 * DAY)} AND ${scope}
      GROUP BY c.id, c.name ORDER BY spent DESC LIMIT 3`,
    tx.$queryRaw<{ code: string; name: string; due: bigint; sum: bigint; n: bigint }[]>`
      SELECT o.code, c.name, (o.total - o.paid_total)::bigint AS due, sum(o.total - o.paid_total) OVER ()::bigint AS sum, count(*) OVER ()::bigint AS n
      FROM "order" o JOIN contact c ON c.id = o.contact_id
      WHERE o.deleted_at IS NULL AND o.status IN ('new', 'processing') AND o.total > o.paid_total AND ${scope}
      ORDER BY due DESC LIMIT 3`,
    tx.$queryRaw<{ revenue: bigint; total: bigint; paid: bigint; cancelled: bigint }[]>`
      SELECT coalesce(sum(o.paid_total - o.refunded_total) FILTER (WHERE o.status <> 'cancelled'), 0)::bigint AS revenue,
        count(*) FILTER (WHERE o.status <> 'cancelled')::bigint AS total,
        count(*) FILTER (WHERE o.status <> 'cancelled' AND o.pay_status = 'paid')::bigint AS paid,
        count(*) FILTER (WHERE o.status = 'cancelled')::bigint AS cancelled
      FROM "order" o WHERE o.deleted_at IS NULL AND o.created_at >= ${monthAgo} AND ${scope}`,
  ]);
  const nCancelled = Number(cancelled[0]?.n ?? 0);
  const mm = month[0]!;
  return {
    risk: waiting.length
      ? interpolate(m.risk, { count: all, waiting: waiting.length, waitList: `: ${waiting.map((w) => `${w.code} · ${w.name}`).join(', ')}`, cancelled: nCancelled })
      : interpolate(m.riskEmpty, { cancelled: nCancelled }),
    upsell: top.length ? interpolate(m.upsell, { list: top.map((t) => `${t.name} (${fmt.moneyShort(String(t.spent))})`).join(', ') }) : m.upsellEmpty,
    collect: due.length
      ? interpolate(m.collect, { count: Number(due[0]!.n), amount: fmt.moneyShort(String(due[0]!.sum)), list: `: ${due.map((d) => `${d.code} · ${d.name} · ${fmt.moneyShort(String(d.due))}`).join(', ')}` })
      : m.collectEmpty,
    analyze: interpolate(m.analyze, { revenue: fmt.moneyShort(String(mm.revenue)), rate: pct(Number(mm.paid), Number(mm.total)), paid: Number(mm.paid), total: Number(mm.total), cancelled: Number(mm.cancelled) }),
  };
}

const EMPTY = { crm: { ltv: '0', total: 0, tier: '', points: 0 }, insight: '', files: [] as { name: string; ext: string; by: string; at: string; size: string }[] };

/** Thẻ CRM / nhận định / tệp của MỘT đơn (drawer). Không có đơn → khung rỗng. */
export async function orderInsights(tx: TenantTx, o: OrderRecord | null, p: Place) {
  if (!o) return EMPTY;
  const m = serverMessages(p.locale).sales.order;
  const fmt = createFmt(p);
  const [contact, count] = await Promise.all([
    tx.contact.findUnique({ where: { id: o.contactId }, select: { name: true, totalSpent: true, tierKey: true, pointsBalance: true } }),
    tx.order.count({ where: { contactId: o.contactId, deletedAt: null, status: { not: 'cancelled' } } }),
  ]);
  const points = Number(contact?.pointsBalance ?? 0n);
  const insight =
    interpolate(m.insight, { name: contact?.name ?? '', count, spent: fmt.moneyShort(String(contact?.totalSpent ?? 0n)) }) +
    (contact?.tierKey ? interpolate(m.insightTier, { tier: contact.tierKey, points: fmt.number(points) }) : '');
  return { crm: { ltv: String(contact?.totalSpent ?? 0n), total: count, tier: contact?.tierKey ?? '', points }, insight, files: EMPTY.files };
}
