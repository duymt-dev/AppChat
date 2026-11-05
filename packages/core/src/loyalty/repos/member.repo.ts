// Danh sách thành viên (TIP-036, D42): thành viên = khách còn hiệu lực trong scope crm của người xem; lọc hạng (`tier_key`, null =
// Thành viên) + tìm tên (f_unaccent trigram) / SĐT (phone_norm). Bước 1 chọn id theo (created_at DESC, id DESC) LIMIT / OFFSET (index
// `contact_tier_recent_idx` / `contact_owner_tier_idx`), bước 2 nạp payload + tổng hợp sổ điểm cho đúng trang bằng một truy vấn gom nhóm
// (không N+1). Đếm tổng cùng điều kiện.
import { TenantSql as Prisma } from '@appchat/db';
import { foldText, normalizePhone, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { crmScopeSql } from '../../crm/public';

export interface MemberFilter {
  tier?: string;
  q?: string;
}

function where(authz: AuthzContext, f: MemberFilter): Prisma.Sql {
  const parts = [Prisma.sql`c.deleted_at IS NULL`, crmScopeSql(authz)];
  if (f.tier && f.tier !== 'all') parts.push(f.tier === 'member' ? Prisma.sql`(c.tier_key IS NULL OR c.tier_key = 'member')` : Prisma.sql`c.tier_key = ${f.tier}`);
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    const phone = normalizePhone(q);
    const or = [Prisma.sql`f_unaccent(lower(c.name)) LIKE ${like}`, Prisma.sql`lower(c.code) LIKE ${like}`];
    if (phone) or.push(Prisma.sql`c.phone_norm LIKE ${`%${phone.replace(/^0/, '')}%`}`);
    parts.push(Prisma.sql`(${Prisma.join(or, ' OR ')})`);
  }
  return Prisma.join(parts, ' AND ');
}

export async function memberIds(tx: TenantTx, authz: AuthzContext, f: MemberFilter, page: { offset: number; limit: number }) {
  const w = where(authz, f);
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM contact c WHERE ${w} ORDER BY c.created_at DESC, c.id DESC LIMIT ${page.limit} OFFSET ${page.offset}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM contact c WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

export interface MemberAgg {
  contact_id: string;
  earned: bigint;
  used: bigint;
  expiring: bigint;
}

/** Tổng hợp sổ điểm cho một trang id: tích trong cửa sổ (earn / điều chỉnh dương − đảo), đã dùng (đổi điểm còn hiệu lực), sắp hết hạn. */
export async function memberAggs(tx: Pick<TenantTx, '$queryRaw'>, ids: string[], windowFrom: Date, now: Date, expiringUntil: Date): Promise<Map<string, MemberAgg>> {
  if (!ids.length) return new Map();
  const list = Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`));
  const rows = await tx.$queryRaw<MemberAgg[]>`
    SELECT l.contact_id,
      coalesce(sum(CASE WHEN l.kind IN ('earn', 'adjust') AND l.delta > 0 AND l.created_at >= ${windowFrom} THEN l.delta
                        WHEN l.kind = 'reverse' AND l.created_at >= ${windowFrom} THEN l.delta ELSE 0 END), 0)::bigint AS earned,
      coalesce(sum(CASE WHEN l.kind = 'redeem' AND l.reversed_by_id IS NULL THEN -l.delta ELSE 0 END), 0)::bigint AS used,
      coalesce(sum(CASE WHEN l.remaining > 0 AND l.expires_at > ${now} AND l.expires_at <= ${expiringUntil} THEN l.remaining ELSE 0 END), 0)::bigint AS expiring
    FROM loyalty_ledger l WHERE l.contact_id IN (${list}) GROUP BY l.contact_id`;
  return new Map(rows.map((r) => [r.contact_id, r]));
}
