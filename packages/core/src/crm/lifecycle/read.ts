// Thùng rác khách (TIP-015f §5.3): crm.delete VÀ crm.view + scope đọc crm hiện tại (áp TRƯỚC phân trang) — không có thùng rác toàn
// workspace. Cursor seek (deleted_at DESC, id DESC), mặc định 30 / tối đa 100; tìm theo biểu thức đã chuẩn hoá có index (tên không dấu /
// SĐT chuẩn hoá / mã). Deferred join: trang id qua contact_deleted_recent_idx rồi mới lấy cột. Trạng thái restorable chỉ khi còn hạn + đủ
// điều kiện xoá hiện tại (thấy trong thùng rác ≠ quyền ghi).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, can, foldText, normalizePhone, type AuthzContext, type DeletedContact } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { scopeSql } from '../services/access';
import { canDeleteContact } from './authority';
import { receiptStatus } from './receipts';

const enc = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
function dec(c: string): { at: Date; id: string } {
  const [a, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const at = new Date(a ?? '');
  if (!id || Number.isNaN(at.getTime())) throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
  return { at, id };
}

export async function deletedContacts(tx: TenantTx, authz: AuthzContext, q: { q?: string; cursor?: string; limit?: number }, now: Date): Promise<{ data: DeletedContact[]; next_cursor: string | null }> {
  if (!can(authz, 'crm.delete') || !can(authz, 'crm.view')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.delete' });
  const limit = Math.min(Math.max(q.limit ?? 30, 1), 100);
  const after = q.cursor ? dec(q.cursor) : null;
  const term = q.q?.trim();
  const phone = term ? normalizePhone(term) : null;
  const search = term
    ? Prisma.sql`AND (f_unaccent(lower(c.name)) LIKE ${`%${foldText(term).replace(/[\\%_]/g, (x) => `\\${x}`)}%`} OR c.code = ${term.toUpperCase()}${phone ? Prisma.sql` OR c.phone_norm = ${phone}` : Prisma.empty})`
    : Prisma.empty;
  const page = after ? Prisma.sql`AND (c.deleted_at, c.id) < (${after.at}, ${after.id}::uuid)` : Prisma.empty;
  const ids = await tx.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM contact c
    WHERE c.deleted_at IS NOT NULL AND c.merged_into_id IS NULL AND ${scopeSql(authz, 'read')} ${search} ${page}
    ORDER BY c.deleted_at DESC, c.id DESC LIMIT ${limit + 1}`;
  const more = ids.length > limit;
  const pick = ids.slice(0, limit).map((r) => r.id);
  if (!pick.length) return { data: [], next_cursor: null };
  const rows = await tx.contact.findMany({ where: { id: { in: pick } }, select: { id: true, code: true, name: true, phone: true, ownerUserId: true, teamId: true, deletedAt: true, version: true, lifecycleRevision: true } });
  const recs = await tx.contactLifecycleReceipt.findMany({ where: { contactId: { in: pick } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const rec = new Map(recs.map((r) => [`${r.contactId}:${r.lifecycleRevision}`, r]));
  const data = pick.flatMap((id) => {
    const c = byId.get(id);
    if (!c?.deletedAt) return [];
    const r = rec.get(`${c.id}:${c.lifecycleRevision}`) ?? null;
    const st = receiptStatus(r, now);
    return [{
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      owner_user_id: c.ownerUserId,
      deleted_at: c.deletedAt.toISOString(),
      restore_until: (r?.restoreUntil ?? c.deletedAt).toISOString(),
      version: c.version,
      status: st === 'restorable' && !canDeleteContact(authz, c) ? ('blocked' as const) : st,
    }];
  });
  const last = byId.get(pick[pick.length - 1]!);
  return { data, next_cursor: more && last?.deletedAt ? enc(last.deletedAt, last.id) : null };
}
