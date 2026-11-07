// Metric bán hàng (TIP-038 mục 1, COMMERCE §9): KHÔNG cộng báo giá + đơn + thu tiền thành một "doanh thu".
//   sales.booked    — đơn không huỷ, chưa xoá, theo ngày tạo (workspace) — tổng `order.total`, số đơn. Nguồn: order.view + scope sales.
//   sales.collected — khoản thu `confirmed` dương (trừ điểm) trừ hoàn tiền `confirmed` (số âm trong sổ) theo `paid_at` — thu ròng. Nguồn: quyền
//                     đọc tài chính hiện có (invoice.manage / payment.record — như /v1/invoices), scope theo đề nghị / đơn gắn khoản thu.
// Mỗi dòng sổ đếm đúng một lần (không join nhân bản: LEFT JOIN theo khoá chính). Index: order_live_recent_idx (created_at) / owner / team;
// customer_payment_confirmed_paid_idx (paid_at) partial confirmed ∧ kind ≠ points — migration 20261102003800_insights.
import { TenantSql as Prisma } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { invoiceScopeSql } from '../../sales/payments/invoice-access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { bucketsSql, insightAuthz, money, num, sourceDenial, unavailable, type MetricBody, type MetricCtx } from './common';

interface Bucket { k: string; amount: bigint; n: bigint }

const fill = (keys: string[], rows: Bucket[]) => {
  const by = new Map(rows.map((r) => [r.k, r]));
  return keys.map((k) => ({ period: k, amount: money(by.get(k)?.amount), count: num(by.get(k)?.n) }));
};

const COLUMNS: MetricBody['columns'] = [
  { key: 'period', format: 'date' },
  { key: 'amount', format: 'money' },
  { key: 'count', format: 'number' },
];

export async function salesBooked(c: MetricCtx): Promise<MetricBody> {
  const a = insightAuthz(c.authz);
  const deny = sourceDenial(a, ['order.view'], 'sales');
  if (deny) return unavailable(COLUMNS, 'order', deny);
  const b = bucketsSql(c.window);
  const rows = await c.tx.$queryRaw<Bucket[]>`
    SELECT b.k, coalesce(sum(o.total), 0)::bigint AS amount, count(*) AS n FROM ${b.sql}
    JOIN "order" o ON o.created_at >= b.s AND o.created_at < b.e
    WHERE o.deleted_at IS NULL AND o.status <> 'cancelled' AND ${orderScopeSql(a)}
    GROUP BY b.k`;
  const out = fill(b.keys, rows);
  return {
    columns: COLUMNS,
    rows: out,
    chart: { kind: 'column', x: 'period', y: 'amount' },
    sources: [{ type: 'order', route: '/orders', description: 'orders not cancelled, by created date (workspace time)' }],
    sample_count: out.reduce((s, r) => s + r.count, 0),
    availability: { status: 'ok', excluded: [] },
  };
}

/** Khoản thu (alias p) trong scope: theo đề nghị (i) nếu gắn đề nghị, theo đơn (o) nếu chỉ gắn đơn; không gắn gì → chỉ scope sales `all`. */
const paymentScope = (a: AuthzContext) =>
  Prisma.sql`((i.id IS NOT NULL AND ${invoiceScopeSql(a)}) OR (i.id IS NULL AND o.id IS NOT NULL AND ${orderScopeSql(a)}) OR (i.id IS NULL AND o.id IS NULL AND ${a.isOwner || a.scope.sales === 'all'}))`;

export async function salesCollected(c: MetricCtx): Promise<MetricBody> {
  const a = insightAuthz(c.authz);
  const deny = sourceDenial(a, ['invoice.manage', 'payment.record'], 'sales');
  if (deny) return unavailable(COLUMNS, 'customer_payment', deny);
  const b = bucketsSql(c.window);
  const rows = await c.tx.$queryRaw<Bucket[]>`
    SELECT b.k, coalesce(sum(p.amount), 0)::bigint AS amount, count(*) FILTER (WHERE p.amount > 0) AS n
    FROM ${b.sql} JOIN customer_payment p ON p.paid_at >= b.s AND p.paid_at < b.e
    LEFT JOIN invoice i ON i.id = p.invoice_id LEFT JOIN "order" o ON o.id = p.order_id
    WHERE p.status = 'confirmed' AND p.kind <> 'points' AND ${paymentScope(a)}
    GROUP BY b.k`;
  const out = fill(b.keys, rows);
  return {
    columns: COLUMNS,
    rows: out,
    chart: { kind: 'column', x: 'period', y: 'amount' },
    sources: [{ type: 'customer_payment', route: '/invoices', description: 'confirmed payments minus confirmed refunds, by paid date (workspace time); loyalty points excluded' }],
    sample_count: out.reduce((s, r) => s + r.count, 0),
    availability: { status: 'ok', excluded: [] },
  };
}
