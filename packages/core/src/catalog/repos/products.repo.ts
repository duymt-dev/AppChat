// Danh sách sản phẩm (D42 — bảng có số trang, indexing §3–7): bước 1 lấy `id` theo index (lọc + `created_at DESC, id DESC`)
// có OFFSET / LIMIT; bước 2 nạp đủ cột theo PK cho đúng trang (deferred join — catalog-read). Lọc danh mục dùng
// `product_live_category_idx`, không lọc dùng `product_live_recent_idx`, tìm `q` không dấu dùng đúng biểu thức của
// `product_name_trgm_idx`; `cf.*` dùng GIN `custom`. Sản phẩm lưu trữ (`deleted_at`) không bao giờ vào danh sách.
import { TenantSql as Prisma } from '@appchat/db';
import { PRODUCT_TYPES, foldText } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID } from '../services/catalog-write';

export interface ProductFilter {
  /** Tên danh mục (FE) — `all` / '' = mọi danh mục. */
  category?: string;
  categoryId?: string;
  type?: string;
  status?: string;
  q?: string;
  custom?: Record<string, string>;
}

const STATUSES = new Set(['active', 'draft']);

function where(f: ProductFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`];
  if (f.categoryId) parts.push(UUID.test(f.categoryId) ? Prisma.sql`p.category_id = ${f.categoryId}::uuid` : Prisma.sql`FALSE`);
  else if (f.category && f.category !== 'all')
    parts.push(Prisma.sql`p.category_id = (SELECT c.id FROM product_category c WHERE lower(c.name) = lower(${f.category}) LIMIT 1)`);
  if (f.type) parts.push((PRODUCT_TYPES as readonly string[]).includes(f.type) ? Prisma.sql`p.type = ${f.type}::product_type` : Prisma.sql`FALSE`);
  if (f.status) parts.push(STATUSES.has(f.status) ? Prisma.sql`p.status = ${f.status}::product_status` : Prisma.sql`FALSE`);
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    parts.push(Prisma.sql`(f_unaccent(lower(p.name)) LIKE ${like} OR lower(p.code) LIKE ${like})`);
  }
  for (const [key, want] of Object.entries(f.custom ?? {})) {
    if (!want || !/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
    parts.push(Prisma.sql`(p.custom -> ${key} @> to_jsonb(${want}::text) OR lower(p.custom ->> ${key}) LIKE ${`%${want.toLowerCase()}%`})`);
  }
  return Prisma.join(parts, ' AND ');
}

/** Xuất danh sách (TIP-038b P3): TOÀN BỘ id khớp bộ lọc, cùng `where` + thứ tự danh sách — tối đa `cap` (gọi cap + 1 để biết vượt trần). */
export async function snapshotProductIds(tx: TenantTx, f: ProductFilter, cap: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT p.id FROM product p WHERE ${where(f)} ORDER BY p.created_at DESC, p.id DESC LIMIT ${cap}`;
  return rows.map((r) => r.id);
}

export async function listProductIds(tx: TenantTx, f: ProductFilter, page: { offset: number; limit: number } | null) {
  const w = where(f);
  const paging = page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.sql`LIMIT 2000`;
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT p.id FROM product p WHERE ${w} ORDER BY p.created_at DESC, p.id DESC ${paging}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM product p WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

/** Tìm cho agent / chọn hàng ở báo giá: sản phẩm đang bán khớp tên / mã, tên khớp đầu trước. */
export async function searchProductIds(tx: TenantTx, q: string, type: string | undefined, limit: number) {
  const f: ProductFilter = { q, type, status: 'active' };
  const head = `${foldText(q.trim())}%`;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM product p WHERE ${where(f)}
    ORDER BY (f_unaccent(lower(p.name)) LIKE ${head}) DESC, p.sold DESC, p.created_at DESC, p.id DESC LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

/** KPI trang Sản phẩm: tổng / đang bán (chưa lưu trữ) + số bán trong tháng theo múi giờ workspace (sổ kho `sale` − `return`, TIP-031 ghi). */
export async function productStats(tx: TenantTx, now: Date, timeZone: string) {
  const monthStart = Prisma.sql`(date_trunc('month', ${now}::timestamptz AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone})`;
  const [c] = await tx.$queryRaw<{ total: bigint; active: bigint; sold: bigint | null }[]>`
    SELECT count(*) FILTER (WHERE deleted_at IS NULL) AS total,
           count(*) FILTER (WHERE deleted_at IS NULL AND status = 'active') AS active,
           (SELECT -sum(m.qty) FROM stock_movement m WHERE m.kind IN ('sale', 'return') AND m.created_at >= ${monthStart} AND m.created_at <= ${now}) AS sold
    FROM product`;
  return { total: Number(c?.total ?? 0), active: Number(c?.active ?? 0), soldMonth: Math.max(0, Number(c?.sold ?? 0)) };
}
