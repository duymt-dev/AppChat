// Danh sách báo giá (D42 — bảng có số trang, indexing §3–7): bước 1 lấy `id` theo index partial `quote_live_*` (bỏ bản cũ
// `superseded` + đã xoá) + scope sales, `created_at DESC, id DESC`, OFFSET / LIMIT; bước 2 nạp đủ cột theo PK (deferred join — read
// service). Lọc trạng thái dùng `quote_live_status_idx`, theo người phụ trách `quote_live_owner_idx`, theo khách `quote_contact_idx`.
import { TenantSql as Prisma } from '@appchat/db';
import { QUOTE_STATUSES, foldText, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { UUID, quoteScopeSql } from '../quote-access';
import { inFamilySql } from '../../../crm/lifecycle/family-sql';

export interface QuoteFilter {
  status?: string;
  /** Người tạo (doanh số) — giữ nghĩa cũ của `owner_id`. */
  ownerId?: string;
  /** Người phụ trách vận hành (TIP-015d) — bộ lọc riêng `assigned_user_id`. */
  assignedId?: string;
  contactId?: string;
  /** `old` = khách cũ (đã mua), `new` = khách mới. */
  returning?: string;
  q?: string;
  custom?: Record<string, string>;
}

const LIVE = Prisma.sql`q.deleted_at IS NULL AND q.status <> 'superseded'`;

function where(authz: AuthzContext, f: QuoteFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [LIVE, quoteScopeSql(authz)];
  if (f.status && f.status !== 'all') parts.push((QUOTE_STATUSES as readonly string[]).includes(f.status) ? Prisma.sql`q.status = ${f.status}::quote_status` : Prisma.sql`FALSE`);
  if (f.ownerId && f.ownerId !== 'all') parts.push(UUID.test(f.ownerId) ? Prisma.sql`q.owner_user_id = ${f.ownerId}::uuid` : Prisma.sql`FALSE`);
  if (f.assignedId && f.assignedId !== 'all') parts.push(UUID.test(f.assignedId) ? Prisma.sql`q.assigned_user_id = ${f.assignedId}::uuid` : Prisma.sql`FALSE`);
  if (f.contactId) parts.push(UUID.test(f.contactId) ? inFamilySql('q.contact_id', f.contactId) : Prisma.sql`FALSE`);
  if (f.returning === 'old' || f.returning === 'new') {
    const old = Prisma.sql`EXISTS (SELECT 1 FROM contact c WHERE c.id = q.contact_id AND (c.stage = 'won' OR c.last_order_at IS NOT NULL))`;
    parts.push(f.returning === 'old' ? old : Prisma.sql`NOT ${old}`);
  }
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    parts.push(Prisma.sql`(lower(q.code) LIKE ${like}
      OR EXISTS (SELECT 1 FROM contact c WHERE c.id = q.contact_id AND f_unaccent(lower(c.name)) LIKE ${like})
      OR EXISTS (SELECT 1 FROM quote_item i WHERE i.quote_id = q.id AND f_unaccent(lower(i.name)) LIKE ${like}))`);
  }
  for (const [key, want] of Object.entries(f.custom ?? {})) {
    if (!want || !/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
    parts.push(Prisma.sql`(q.custom -> ${key} @> to_jsonb(${want}::text) OR lower(q.custom ->> ${key}) LIKE ${`%${want.toLowerCase()}%`})`);
  }
  return Prisma.join(parts, ' AND ');
}

/** Xuất danh sách (TIP-038 pha 3): TOÀN BỘ id khớp bộ lọc, cùng `where` + thứ tự danh sách (không cắt 2.000) — tối đa `cap` id (gọi cap + 1
 * để biết vượt trần). Chỉ id theo index partial; cột đủ nạp theo PK ở reader (deferred join). */
export async function snapshotQuoteIds(tx: TenantTx, authz: AuthzContext, f: QuoteFilter, cap: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT q.id FROM quote q WHERE ${where(authz, f)} ORDER BY q.created_at DESC, q.id DESC LIMIT ${cap}`;
  return rows.map((r) => r.id);
}

export async function listQuoteIds(tx: TenantTx, authz: AuthzContext, f: QuoteFilter, page: { offset: number; limit: number } | null) {
  const w = where(authz, f);
  const paging = page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.sql`LIMIT 2000`;
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT q.id FROM quote q WHERE ${w} ORDER BY q.created_at DESC, q.id DESC ${paging}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM quote q WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

/** Số báo giá theo trạng thái (chip lọc + KPI) trong scope người xem. */
export async function statusCounts(tx: TenantTx, authz: AuthzContext) {
  const rows = await tx.$queryRaw<{ status: string; n: bigint }[]>`
    SELECT q.status::text AS status, count(*)::bigint AS n FROM quote q WHERE ${LIVE} AND ${quoteScopeSql(authz)} GROUP BY q.status`;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
}

/** Báo giá đã gửi chưa phản hồi quá `days` ngày (gợi ý follow-up). */
export async function staleSent(tx: TenantTx, authz: AuthzContext, before: Date, limit: number) {
  return tx.$queryRaw<{ code: string; name: string; total: bigint }[]>`
    SELECT q.code, c.name, q.total FROM quote q JOIN contact c ON c.id = q.contact_id
    WHERE ${LIVE} AND ${quoteScopeSql(authz)} AND q.status IN ('sent', 'viewed') AND q.sent_at < ${before}
    ORDER BY q.sent_at LIMIT ${limit}`;
}
