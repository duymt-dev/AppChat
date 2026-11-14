// Danh sách khách (D42 — bảng có số trang, indexing §3–7): bước 1 lấy `id` theo index (scope + lọc + sort, id phụ để ổn định)
// có OFFSET / LIMIT; bước 2 nạp đủ cột theo PK cho đúng trang (deferred join). Sắp xếp (TIP-026): `recent` = tương tác gần nhất
// (`contact_live_recent_idx`), `name` / `created` / `value` có index partial riêng (migration 026). Kanban: đếm theo giai đoạn ở
// đây, trang thẻ mỗi cột theo cursor ở board-page.ts (TIP-026b). Tìm `q` không dấu dùng đúng biểu thức của index trigram.
import { TenantSql as Prisma } from '@appchat/db';
import { foldText, normalizePhone, type AuthzContext, type ContactSort } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { scopeSql } from '../services/access';

export interface ContactFilter {
  stage?: string;
  ownerId?: string;
  status?: string;
  group?: string;
  source?: string;
  tagId?: string;
  mine?: boolean;
  q?: string;
  /** `cf.<key>` → giá trị (chọn = bằng / chứa phần tử; chữ = chứa). */
  custom?: Record<string, string>;
  sort?: ContactSort;
}

const ORDER: Record<ContactSort, Prisma.Sql> = {
  recent: Prisma.sql`c.last_interaction_at DESC, c.id DESC`,
  name: Prisma.sql`c.name ASC, c.id ASC`,
  created: Prisma.sql`c.created_at DESC, c.id DESC`,
  value: Prisma.sql`c.total_spent DESC, c.id DESC`,
};
const orderOf = (f: ContactFilter) => ORDER[f.sort ?? 'recent'] ?? ORDER.recent;

export const STAGES = new Set(['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost']);
const STATUSES = new Set(['active', 'potential', 'inactive']);
const GROUPS = new Set(['vip', 'loyal', 'new', 'potential']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Điều kiện lọc + scope dùng chung danh sách / kanban / thống kê / xuất (TIP-026b §4.1 — một bộ lọc chuẩn hoá). */
export function where(authz: AuthzContext, f: ContactFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`c.deleted_at IS NULL`, scopeSql(authz)];
  if (f.stage && STAGES.has(f.stage)) parts.push(Prisma.sql`c.stage = ${f.stage}::contact_stage`);
  if (f.status && STATUSES.has(f.status)) parts.push(Prisma.sql`c.status = ${f.status}::contact_status`);
  if (f.group && GROUPS.has(f.group)) parts.push(Prisma.sql`c."group" = ${f.group}::contact_group`);
  if (f.source) parts.push(Prisma.sql`c.source = ${f.source}`);
  if (f.ownerId) parts.push(UUID.test(f.ownerId) ? Prisma.sql`c.owner_user_id = ${f.ownerId}::uuid` : Prisma.sql`FALSE`);
  if (f.tagId) parts.push(UUID.test(f.tagId) ? Prisma.sql`EXISTS (SELECT 1 FROM contact_tag ct WHERE ct.contact_id = c.id AND ct.tag_id = ${f.tagId}::uuid)` : Prisma.sql`FALSE`);
  if (f.mine) {
    const me = authz.userId;
    parts.push(Prisma.sql`(c.owner_user_id = ${me}::uuid OR EXISTS (SELECT 1 FROM contact_collaborator m WHERE m.user_id = ${me}::uuid AND m.contact_id = c.id))`);
  }
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    const phone = normalizePhone(q);
    const or = [Prisma.sql`f_unaccent(lower(c.name)) LIKE ${like}`, Prisma.sql`lower(c.email) LIKE ${like}`, Prisma.sql`f_unaccent(lower(coalesce(c.title, ''))) LIKE ${like}`, Prisma.sql`lower(c.code) LIKE ${like}`];
    if (phone) or.push(Prisma.sql`c.phone_norm LIKE ${`%${phone.replace(/^0/, '')}%`}`);
    parts.push(Prisma.sql`(${Prisma.join(or, ' OR ')})`);
  }
  for (const [key, want] of Object.entries(f.custom ?? {})) {
    if (!want || !/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
    // Giá trị mảng (multi / tags) chứa phần tử, hoặc giá trị đơn bằng / chứa (không phân biệt hoa thường).
    parts.push(Prisma.sql`(c.custom -> ${key} @> to_jsonb(${want}::text) OR lower(c.custom ->> ${key}) LIKE ${`%${want.toLowerCase()}%`})`);
  }
  return Prisma.join(parts, ' AND ');
}

export async function listContactIds(tx: TenantTx, authz: AuthzContext, f: ContactFilter, page: { offset: number; limit: number } | null) {
  const w = where(authz, f);
  const paging = page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.sql`LIMIT 5000`;
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM contact c WHERE ${w} ORDER BY ${orderOf(f)} ${paging}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM contact c WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

/** Toàn bộ id khớp bộ lọc + scope theo thứ tự danh sách — KHÔNG giới hạn (chốt tập xuất, TIP-045b annex D: không cắt ngầm 5.000). */
export async function snapshotContactIds(tx: TenantTx, authz: AuthzContext, f: ContactFilter): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM contact c WHERE ${where(authz, f)} ORDER BY ${orderOf(f)}`;
  return rows.map((r) => r.id);
}

/** Đếm theo giai đoạn trong phạm vi người xem (chip kanban — `/contacts/stats`). */
export async function stageCounts(tx: TenantTx, authz: AuthzContext): Promise<Record<string, number>> {
  const rows = await tx.$queryRaw<{ stage: string; n: bigint }[]>`
    SELECT c.stage::text AS stage, count(*)::bigint AS n FROM contact c WHERE c.deleted_at IS NULL AND ${scopeSql(authz)} GROUP BY c.stage`;
  return Object.fromEntries(rows.map((r) => [r.stage, Number(r.n)]));
}

/** Kanban: đếm mỗi giai đoạn theo bộ lọc + scope (bỏ lọc `stage` của danh sách) — trang thẻ ở board-page.ts. */
export async function boardCounts(tx: TenantTx, authz: AuthzContext, f: ContactFilter): Promise<Record<string, number>> {
  const rows = await tx.$queryRaw<{ stage: string; n: bigint }[]>`SELECT c.stage::text AS stage, count(*)::bigint AS n FROM contact c WHERE ${where(authz, { ...f, stage: undefined })} GROUP BY c.stage`;
  return Object.fromEntries(rows.map((r) => [r.stage, Number(r.n)]));
}
