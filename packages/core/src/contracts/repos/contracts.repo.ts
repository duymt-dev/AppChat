// Danh sách hợp đồng (D42 — bảng có số trang, indexing §3–7): bước 1 lấy `id` theo index partial `contract_live_*` + scope sales,
// `created_at DESC, id DESC`, OFFSET / LIMIT; bước 2 nạp đủ cột theo PK (deferred join — read service). Chip lọc gộp trạng thái
// (COMMERCE §9: "Chờ duyệt" trong Nháp); khoảng giá trị (< 10tr · 10–30tr · > 30tr); `q` không dấu theo mã / tên khách / dịch vụ.
import { TenantSql as Prisma } from '@appchat/db';
import { CONTRACT_CHIP_STATUSES, foldText, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, contractScopeSql } from '../contract-access';
import { inFamilySql } from '../../crm/lifecycle/family-sql';

export interface ContractFilter {
  /** Chip: all | draft | pending | signed | expired. */
  status?: string;
  ownerId?: string;
  /** Người phụ trách vận hành (TIP-032c) — `owner_id` giữ nghĩa người tạo. */
  assignedId?: string;
  contactId?: string;
  /** lt10 | 10to30 | gt30 */
  value?: string;
  q?: string;
}

const LIVE = Prisma.sql`c.deleted_at IS NULL`;
const VALUE: Record<string, Prisma.Sql> = {
  lt10: Prisma.sql`c.value < 10000000`,
  '10to30': Prisma.sql`c.value BETWEEN 10000000 AND 30000000`,
  gt30: Prisma.sql`c.value > 30000000`,
};

function where(authz: AuthzContext, f: ContractFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [LIVE, contractScopeSql(authz)];
  if (f.status && f.status !== 'all') {
    const st = CONTRACT_CHIP_STATUSES[f.status];
    parts.push(st ? Prisma.sql`c.status IN (${Prisma.join(st.map((s) => Prisma.sql`${s}::contract_status`))})` : Prisma.sql`FALSE`);
  }
  if (f.ownerId && f.ownerId !== 'all') parts.push(UUID.test(f.ownerId) ? Prisma.sql`c.owner_user_id = ${f.ownerId}::uuid` : Prisma.sql`FALSE`);
  if (f.assignedId && f.assignedId !== 'all') parts.push(UUID.test(f.assignedId) ? Prisma.sql`c.assigned_user_id = ${f.assignedId}::uuid` : Prisma.sql`FALSE`);
  if (f.contactId) parts.push(UUID.test(f.contactId) ? inFamilySql('c.contact_id', f.contactId) : Prisma.sql`FALSE`);
  if (f.value && f.value !== 'all' && VALUE[f.value]) parts.push(VALUE[f.value]!);
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    // Mã HĐ-… có chữ Đ: so trên mã đã bỏ dấu (như `foldText` của từ khoá) — `lower(code)` giữ `đ` nên không bao giờ khớp `hd`.
    parts.push(Prisma.sql`(f_unaccent(lower(c.code)) LIKE ${like} OR f_unaccent(lower(c.title)) LIKE ${like}
      OR EXISTS (SELECT 1 FROM contact k WHERE k.id = c.contact_id AND f_unaccent(lower(k.name)) LIKE ${like}))`);
  }
  return Prisma.join(parts, ' AND ');
}

/** Xuất danh sách (TIP-038 pha 3): TOÀN BỘ id khớp bộ lọc, cùng `where` + thứ tự danh sách (không cắt 2.000) — tối đa `cap` id (gọi cap + 1
 * để biết vượt trần). Chỉ id theo index partial; cột đủ nạp theo PK ở reader (deferred join). */
export async function snapshotContractIds(tx: TenantTx, authz: AuthzContext, f: ContractFilter, cap: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM contract c WHERE ${where(authz, f)} ORDER BY c.created_at DESC, c.id DESC LIMIT ${cap}`;
  return rows.map((r) => r.id);
}

export async function listContractIds(tx: TenantTx, authz: AuthzContext, f: ContractFilter, page: { offset: number; limit: number } | null) {
  const w = where(authz, f);
  const paging = page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.sql`LIMIT 2000`;
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM contract c WHERE ${w} ORDER BY c.created_at DESC, c.id DESC ${paging}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM contract c WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

/** Số hợp đồng theo trạng thái + giá trị đang hiệu lực trong scope người xem. */
export async function contractCounts(tx: TenantTx, authz: AuthzContext) {
  const rows = await tx.$queryRaw<{ status: string; n: bigint; v: bigint }[]>`
    SELECT c.status::text AS status, count(*)::bigint AS n, coalesce(sum(c.value), 0)::bigint AS v
    FROM contract c WHERE ${LIVE} AND ${contractScopeSql(authz)} GROUP BY c.status`;
  return rows.map((r) => ({ status: r.status, n: Number(r.n), value: r.v }));
}

/** Hợp đồng đã ký hết hạn trong N ngày tới (gợi ý gia hạn). */
export async function endingSoon(tx: TenantTx, authz: AuthzContext, from: Date, to: Date, limit: number) {
  return tx.$queryRaw<{ code: string; name: string }[]>`
    SELECT c.code, k.name FROM contract c JOIN contact k ON k.id = c.contact_id
    WHERE ${LIVE} AND ${contractScopeSql(authz)} AND c.status = 'signed' AND c.end_date BETWEEN ${from}::date AND ${to}::date
    ORDER BY c.end_date LIMIT ${limit}`;
}
