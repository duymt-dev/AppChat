// Phiên bản quyền của tenant (TIP-042): bảng một dòng `authz_revision`. Mọi thay đổi vai trò tuỳ biến / nhóm tăng số này CÙNG transaction
// tenant với thay đổi; resolver đọc số mỗi lần (khoá chính, rẻ) và khoá cache theo nó — lần đọc quyền kế tiếp sau commit thấy quyền mới,
// không chờ TTL 60 s hay event relay. Thiếu bảng / dòng (schema cũ chưa migrate) → null = đọc thẳng DB, không suy ra revision 0.
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

/** Tăng phiên bản quyền trong transaction tenant đang mở; trả số mới. */
export async function bumpTenantAuthzRevision(tx: TenantTx, now: Date): Promise<bigint> {
  const r = await tx.authzRevision.upsert({
    where: { id: 1 },
    create: { id: 1, revision: 2n, updatedAt: now },
    update: { revision: { increment: 1 }, updatedAt: now },
    select: { revision: true },
  });
  return r.revision;
}

/** Số phiên bản hiện tại; null nếu bảng chưa có (tenant chưa áp migration TIP-042) hoặc thiếu dòng. */
export async function readTenantAuthzRevision(db: Pick<TenantDb, 'authzRevision'>): Promise<bigint | null> {
  try {
    const r = await db.authzRevision.findUnique({ where: { id: 1 }, select: { revision: true } });
    return r?.revision ?? null;
  } catch {
    return null;
  }
}
