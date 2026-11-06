// customers.at_risk (TIP-038 mục 1): khách đang sống (chưa xoá, không `lost`) đã từng có đơn hoàn tất nhưng không có đơn hoàn tất nào trong
// cửa sổ [hôm nay − days, ngày mai) — `contact.last_order_at` (đặt khi đơn hoàn tất). Xếp theo giá trị đã chi giảm dần (khách giá trị nhất
// trước), ≤ 100 dòng; `sample_count` = tổng số khách thoả (không bị LIMIT). Nguồn: crm.view + scope crm (∩ insights).
// Deferred join: chọn id theo `contact_live_spent_idx (total_spent DESC, id DESC) WHERE deleted_at IS NULL` rồi mới nạp cột hiển thị.
import { TenantSql as Prisma } from '@appchat/db';
import { INSIGHT_LIMITS } from '@appchat/shared';
import { scopeSql as crmScopeSql } from '../../crm/services/access';
import { insightAuthz, money, num, sourceDenial, unavailable, type MetricBody, type MetricCtx } from './common';

const COLUMNS: MetricBody['columns'] = [
  { key: 'code', format: 'text' },
  { key: 'name', format: 'text' },
  { key: 'last_order_at', format: 'date' },
  { key: 'total_spent', format: 'money' },
];

export async function customersAtRisk(c: MetricCtx, limit: number = INSIGHT_LIMITS.atRiskDefault): Promise<MetricBody> {
  const a = insightAuthz(c.authz);
  const deny = sourceDenial(a, ['crm.view'], 'crm');
  if (deny) return unavailable(COLUMNS, 'contact', deny);
  const where = Prisma.sql`c.deleted_at IS NULL AND c.stage <> 'lost' AND c.last_order_at IS NOT NULL AND c.last_order_at < ${c.window.fromUtc} AND ${crmScopeSql(a)}`;
  const [rows, [total]] = await Promise.all([
    c.tx.$queryRaw<{ id: string; code: string; name: string; last_order_at: Date; total_spent: bigint }[]>`
      SELECT k.id, k.code, k.name, k.last_order_at, k.total_spent FROM (
        SELECT c.id FROM contact c WHERE ${where} ORDER BY c.total_spent DESC, c.id DESC LIMIT ${Math.min(limit, INSIGHT_LIMITS.maxRows)}
      ) s JOIN contact k ON k.id = s.id ORDER BY k.total_spent DESC, k.id DESC`,
    c.tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM contact c WHERE ${where}`,
  ]);
  return {
    columns: COLUMNS,
    rows: rows.map((r) => ({ code: r.code, name: r.name, last_order_at: r.last_order_at.toISOString(), total_spent: money(r.total_spent) })),
    sources: [{ type: 'contact', route: '/customers', ids: rows.map((r) => r.id), description: 'customers with a completed order before the window and none inside it' }],
    sample_count: num(total?.n),
    availability: { status: 'ok', excluded: [] },
  };
}
