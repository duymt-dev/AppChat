// Truy vấn sổ điểm (TIP-036): khoá dòng contact (thứ tự khoá chung: contact → lô), lô FIFO còn số dư, điểm tích trong cửa sổ, lịch sử
// theo cursor (created_at, id) chọn id trước rồi JOIN (deferred). Index ở migration `20261102003600_loyalty`.
import type { TenantTx } from '../../kernel/actions/action-context';

export interface Lot {
  id: string;
  remaining: bigint;
  expires_at: Date | null;
}

/** Khoá dòng contact trước mọi ghi sổ của khách — mọi đường (đổi điểm, tích, đảo, hết hạn, điều chỉnh) khoá cùng thứ tự. */
export async function lockMember(tx: TenantTx, contactId: string): Promise<{ id: string; points_balance: bigint; tier_key: string | null } | null> {
  const r = await tx.$queryRaw<{ id: string; points_balance: bigint; tier_key: string | null }[]>`
    SELECT id, points_balance, tier_key FROM contact WHERE id = ${contactId}::uuid AND deleted_at IS NULL FOR UPDATE`;
  return r[0] ?? null;
}

/** Lô còn số dư theo FIFO (hạn sớm trước; không hạn sau cùng), khoá dòng lô. */
export async function openLots(tx: TenantTx, contactId: string, now: Date): Promise<Lot[]> {
  return tx.$queryRaw<Lot[]>`
    SELECT id, remaining, expires_at FROM loyalty_ledger
    WHERE contact_id = ${contactId}::uuid AND remaining > 0 AND (expires_at IS NULL OR expires_at > ${now})
    ORDER BY expires_at ASC NULLS LAST, id ASC
    FOR UPDATE`;
}

/** Điểm tích (earn + điều chỉnh dương) trong cửa sổ [from, to) — căn cứ xét hạng; không tính điểm trả lại khi hoàn tác đổi điểm. */
export async function earnedBetween(tx: Pick<TenantTx, '$queryRaw'>, contactId: string, from: Date, to: Date): Promise<bigint> {
  const r = await tx.$queryRaw<{ n: bigint | null }[]>`
    SELECT sum(delta)::bigint AS n FROM loyalty_ledger
    WHERE contact_id = ${contactId}::uuid AND kind IN ('earn', 'adjust') AND delta > 0 AND created_at >= ${from} AND created_at < ${to}`;
  const reversed = await tx.$queryRaw<{ n: bigint | null }[]>`
    SELECT sum(-delta)::bigint AS n FROM loyalty_ledger
    WHERE contact_id = ${contactId}::uuid AND kind = 'reverse' AND created_at >= ${from} AND created_at < ${to}`;
  const v = (r[0]?.n ?? 0n) - (reversed[0]?.n ?? 0n);
  return v > 0n ? v : 0n;
}

/** Điểm sẽ hết hạn trong `days` ngày tới. */
export async function expiringWithin(tx: Pick<TenantTx, '$queryRaw'>, contactId: string, now: Date, days: number): Promise<bigint> {
  const until = new Date(now.getTime() + days * 86_400_000);
  const r = await tx.$queryRaw<{ n: bigint | null }[]>`
    SELECT sum(remaining)::bigint AS n FROM loyalty_ledger
    WHERE contact_id = ${contactId}::uuid AND remaining > 0 AND expires_at > ${now} AND expires_at <= ${until}`;
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
        FROM (SELECT id FROM loyalty_ledger WHERE contact_id = ${contactId}::uuid AND (created_at, id) < (${cursor.at}, ${cursor.id}::uuid)
              ORDER BY created_at DESC, id DESC LIMIT ${limit}) s
        JOIN loyalty_ledger l ON l.id = s.id ORDER BY l.created_at DESC, l.id DESC`
    : tx.$queryRaw<LedgerRowDb[]>`
        SELECT l.id, l.kind, l.delta, l.balance_after, l.reason, l.note, l.ref_type, l.ref_id, l.expires_at, l.created_at
        FROM (SELECT id FROM loyalty_ledger WHERE contact_id = ${contactId}::uuid ORDER BY created_at DESC, id DESC LIMIT ${limit}) s
        JOIN loyalty_ledger l ON l.id = s.id ORDER BY l.created_at DESC, l.id DESC`;
}
