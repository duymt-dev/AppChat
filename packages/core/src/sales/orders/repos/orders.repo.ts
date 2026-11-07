// Danh sách đơn (D42 — bảng có số trang, indexing §3–7): bước 1 lấy `id` theo index partial `order_live_*` + scope sales,
// `created_at DESC, id DESC`, OFFSET / LIMIT; bước 2 nạp đủ cột theo PK (deferred join — read service). Chip lọc đúng trục của nó
// (COMMERCE §4): Đã huỷ → `status`; Đã thanh toán / Đã cọc / Chờ cọc → `pay_status` của đơn chưa huỷ (`order_live_pay_idx`).
import { TenantSql as Prisma } from '@appchat/db';
import { ORDER_CHIP_PAY, ORDER_SOURCES, foldText, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { UUID, orderScopeSql } from '../order-access';

export interface OrderFilter {
  /** Chip: all | paid | deposit | pending | cancelled. */
  chip?: string;
  ownerId?: string;
  contactId?: string;
  /** lt5 | 5to20 | gt20 */
  value?: string;
  source?: string;
  q?: string;
  custom?: Record<string, string>;
}

const LIVE = Prisma.sql`o.deleted_at IS NULL`;
const VALUE: Record<string, Prisma.Sql> = {
  lt5: Prisma.sql`o.total < 5000000`,
  '5to20': Prisma.sql`o.total BETWEEN 5000000 AND 20000000`,
  gt20: Prisma.sql`o.total > 20000000`,
};

/** Điều kiện của một chip (dùng chung danh sách + đếm). */
export function chipSql(chip: string): Prisma.Sql {
  if (chip === 'cancelled') return Prisma.sql`o.status = 'cancelled'::order_status`;
  const pay = ORDER_CHIP_PAY[chip];
  return pay ? Prisma.sql`o.status <> 'cancelled'::order_status AND o.pay_status = ${pay}::pay_status` : Prisma.sql`FALSE`;
}

function where(authz: AuthzContext, f: OrderFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [LIVE, orderScopeSql(authz)];
  if (f.chip && f.chip !== 'all') parts.push(chipSql(f.chip));
  if (f.ownerId && f.ownerId !== 'all') parts.push(UUID.test(f.ownerId) ? Prisma.sql`o.owner_user_id = ${f.ownerId}::uuid` : Prisma.sql`FALSE`);
  if (f.contactId) parts.push(UUID.test(f.contactId) ? Prisma.sql`o.contact_id = ${f.contactId}::uuid` : Prisma.sql`FALSE`);
  if (f.value && f.value !== 'all' && VALUE[f.value]) parts.push(VALUE[f.value]!);
  if (f.source && f.source !== 'all') parts.push((ORDER_SOURCES as readonly string[]).includes(f.source) ? Prisma.sql`o.source = ${f.source}::order_source` : Prisma.sql`FALSE`);
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    parts.push(Prisma.sql`(lower(o.code) LIKE ${like}
      OR EXISTS (SELECT 1 FROM contact c WHERE c.id = o.contact_id AND f_unaccent(lower(c.name)) LIKE ${like})
      OR EXISTS (SELECT 1 FROM order_item i WHERE i.order_id = o.id AND f_unaccent(lower(i.name)) LIKE ${like}))`);
  }
  for (const [key, want] of Object.entries(f.custom ?? {})) {
    if (!want || !/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
    parts.push(Prisma.sql`(o.custom -> ${key} @> to_jsonb(${want}::text) OR lower(o.custom ->> ${key}) LIKE ${`%${want.toLowerCase()}%`})`);
  }
  return Prisma.join(parts, ' AND ');
}

/** Xuất danh sách (TIP-038 pha 3): TOÀN BỘ id khớp bộ lọc, cùng `where` + thứ tự danh sách (không cắt 2.000) — tối đa `cap` id (gọi cap + 1
 * để biết vượt trần). Chỉ id theo index partial; cột đủ nạp theo PK ở reader (deferred join). */
export async function snapshotOrderIds(tx: TenantTx, authz: AuthzContext, f: OrderFilter, cap: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT o.id FROM "order" o WHERE ${where(authz, f)} ORDER BY o.created_at DESC, o.id DESC LIMIT ${cap}`;
  return rows.map((r) => r.id);
}

export async function listOrderIds(tx: TenantTx, authz: AuthzContext, f: OrderFilter, page: { offset: number; limit: number } | null) {
  const w = where(authz, f);
  const paging = page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.sql`LIMIT 2000`;
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT o.id FROM "order" o WHERE ${w} ORDER BY o.created_at DESC, o.id DESC ${paging}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "order" o WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

/** Số đơn mỗi chip + doanh thu đã thu (đơn chưa huỷ) trong scope người xem. */
export async function chipCounts(tx: TenantTx, authz: AuthzContext) {
  const rows = await tx.$queryRaw<{ all: bigint; paid: bigint; deposit: bigint; pending: bigint; cancelled: bigint; revenue: bigint }[]>`
    SELECT count(*)::bigint AS all,
      count(*) FILTER (WHERE ${chipSql('paid')})::bigint AS paid,
      count(*) FILTER (WHERE ${chipSql('deposit')})::bigint AS deposit,
      count(*) FILTER (WHERE ${chipSql('pending')})::bigint AS pending,
      count(*) FILTER (WHERE ${chipSql('cancelled')})::bigint AS cancelled,
      coalesce(sum(o.paid_total - o.refunded_total) FILTER (WHERE o.status <> 'cancelled'), 0)::bigint AS revenue
    FROM "order" o WHERE ${LIVE} AND ${orderScopeSql(authz)}`;
  const r = rows[0]!;
  return {
    counts: { all: Number(r.all), paid: Number(r.paid), deposit: Number(r.deposit), pending: Number(r.pending), cancelled: Number(r.cancelled) },
    revenue: r.revenue,
  };
}
