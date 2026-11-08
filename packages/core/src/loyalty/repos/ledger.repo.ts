// Truy vấn sổ điểm (TIP-036): khoá dòng contact (thứ tự khoá chung: contact → lô), lô FIFO còn số dư, điểm tích trong cửa sổ, lịch sử
// theo cursor (created_at, id) chọn id trước rồi JOIN (deferred). Index ở migration `20261102003600_loyalty`. TIP-015e: lô / lịch sử / điểm
// tích đọc theo HỌ khách (gốc + nguồn đã gộp — sổ giữ id gốc, không chép / cộng lại).
import type { TenantTx } from '../../kernel/actions/action-context';
import { inFamilySql } from '../../crm/lifecycle/family-sql';

export interface Lot {
  id: string;
  remaining: bigint;
  expires_at: Date | null;
}

/**
 * Khoá dòng contact trước mọi ghi sổ của khách — mọi đường (đổi điểm, tích, đảo, hết hạn, điều chỉnh) khoá cùng thứ tự. TIP-015e: id có thể
 * là khách đã gộp (đơn / đề nghị cũ giữ id gốc) → theo merged_into lên khách GỐC còn sống, khoá gốc, đọc lại (gộp chen giữa → thử lại có
 * giới hạn). Trả thành viên gốc: số dư cache của gốc = số dư cả họ; người gọi ghi sổ với `id` trả về (không ghi vào khách đã gộp).
 */
export async function lockMember(tx: TenantTx, contactId: string): Promise<{ id: string; points_balance: bigint; tier_key: string | null } | null> {
  for (let i = 0; i < 3; i++) {
    const [root] = await tx.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE up(id, merged, depth) AS (
        SELECT id, merged_into_id, 0 FROM contact WHERE id = ${contactId}::uuid
        UNION ALL
        SELECT c.id, c.merged_into_id, up.depth + 1 FROM contact c JOIN up ON c.id = up.merged WHERE up.depth < 32
      ) SELECT id FROM up WHERE merged IS NULL LIMIT 1`;
    if (!root) return null;
    const r = await tx.$queryRaw<{ id: string; points_balance: bigint; tier_key: string | null; merged_into_id: string | null }[]>`
      SELECT id, points_balance, tier_key, merged_into_id FROM contact WHERE id = ${root.id}::uuid AND deleted_at IS NULL FOR UPDATE`;
    const m = r[0];
    if (!m) return null;
    if (!m.merged_into_id) return { id: m.id, points_balance: m.points_balance, tier_key: m.tier_key };
  }
  return null;
}

/** Lô còn số dư theo FIFO (hạn sớm trước; không hạn sau cùng), khoá dòng lô. */
export async function openLots(tx: TenantTx, contactId: string, now: Date): Promise<Lot[]> {
  return tx.$queryRaw<Lot[]>`
    SELECT id, remaining, expires_at FROM loyalty_ledger
    WHERE ${inFamilySql('contact_id', contactId)} AND remaining > 0 AND (expires_at IS NULL OR expires_at > ${now})
    ORDER BY expires_at ASC NULLS LAST, id ASC
    FOR UPDATE`;
}

/** Điểm tích (earn + điều chỉnh dương) trong cửa sổ [from, to) — căn cứ xét hạng; không tính điểm trả lại khi hoàn tác đổi điểm. */
export async function earnedBetween(tx: Pick<TenantTx, '$queryRaw'>, contactId: string, from: Date, to: Date): Promise<bigint> {
  const r = await tx.$queryRaw<{ n: bigint | null }[]>`
    SELECT sum(delta)::bigint AS n FROM loyalty_ledger
    WHERE ${inFamilySql('contact_id', contactId)} AND kind IN ('earn', 'adjust') AND delta > 0 AND created_at >= ${from} AND created_at < ${to}`;
  const reversed = await tx.$queryRaw<{ n: bigint | null }[]>`
    SELECT sum(-delta)::bigint AS n FROM loyalty_ledger
    WHERE ${inFamilySql('contact_id', contactId)} AND kind = 'reverse' AND created_at >= ${from} AND created_at < ${to}`;
  const v = (r[0]?.n ?? 0n) - (reversed[0]?.n ?? 0n);
  return v > 0n ? v : 0n;
}

/** Điểm sẽ hết hạn trong `days` ngày tới. */
export async function expiringWithin(tx: Pick<TenantTx, '$queryRaw'>, contactId: string, now: Date, days: number): Promise<bigint> {
  const until = new Date(now.getTime() + days * 86_400_000);
  const r = await tx.$queryRaw<{ n: bigint | null }[]>`
    SELECT sum(remaining)::bigint AS n FROM loyalty_ledger
    WHERE ${inFamilySql('contact_id', contactId)} AND remaining > 0 AND expires_at > ${now} AND expires_at <= ${until}`;
  return r[0]?.n ?? 0n;
}

export interface LedgerRowDb {
  id: string;
  kind: string;
  delta: bigint;
  balance_after: bigint;
  reason: string;
  note: string;
  ref_type: string | null;
  ref_id: string | null;
  expires_at: Date | null;
  created_at: Date;
}

/** Lịch sử một thành viên, mới trước; cursor = (created_at, id) của dòng cuối trang trước. */
export async function ledgerPage(tx: Pick<TenantTx, '$queryRaw'>, contactId: string, limit: number, cursor?: { at: Date; id: string }): Promise<LedgerRowDb[]> {
  return cursor
    ? tx.$queryRaw<LedgerRowDb[]>`
        SELECT l.id, l.kind, l.delta, l.balance_after, l.reason, l.note, l.ref_type, l.ref_id, l.expires_at, l.created_at
        FROM (SELECT id FROM loyalty_ledger WHERE ${inFamilySql('contact_id', contactId)} AND (created_at, id) < (${cursor.at}, ${cursor.id}::uuid)
              ORDER BY created_at DESC, id DESC LIMIT ${limit}) s
        JOIN loyalty_ledger l ON l.id = s.id ORDER BY l.created_at DESC, l.id DESC`
    : tx.$queryRaw<LedgerRowDb[]>`
        SELECT l.id, l.kind, l.delta, l.balance_after, l.reason, l.note, l.ref_type, l.ref_id, l.expires_at, l.created_at
        FROM (SELECT id FROM loyalty_ledger WHERE ${inFamilySql('contact_id', contactId)} ORDER BY created_at DESC, id DESC LIMIT ${limit}) s
        JOIN loyalty_ledger l ON l.id = s.id ORDER BY l.created_at DESC, l.id DESC`;
}
