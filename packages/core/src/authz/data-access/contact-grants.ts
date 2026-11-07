// Quan hệ người dùng ↔ khách (D32, `contact_collaborator`): collaborator đọc + ghi trong scope, watcher CHỈ đọc + nhận thông báo.
// Một chỗ quyết định "quan hệ này cho phép chế độ nào" — không trả danh sách id chung cho mọi thao tác (TIP-042c).
// Index `contact_collaborator (user_id, contact_id) INCLUDE (role)` (migration record_scopes) → EXISTS là Index Only Scan.
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { AccessMode } from './access-mode';

export type ContactGrant = 'collaborator' | 'watcher';

/** Quan hệ có cho phép chế độ này không — watcher không bao giờ là bằng chứng ghi. */
export const grantAllows = (g: ContactGrant | null | undefined, mode: AccessMode): boolean => !!g && (mode === 'read' || g === 'collaborator');

/** Quan hệ của một người với một khách (null = không có). */
export async function grantOf(tx: Pick<TenantTx, 'contactCollaborator'>, contactId: string | null | undefined, userId: string): Promise<ContactGrant | null> {
  if (!contactId) return null;
  const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId, userId } }, select: { role: true } });
  return cc?.role ?? null;
}

/** Quan hệ của nhiều người với một khách — một truy vấn (lọc người nhận realtime). */
export async function grantsFor(tx: Pick<TenantTx, 'contactCollaborator'>, contactId: string, userIds: readonly string[]): Promise<Map<string, ContactGrant>> {
  if (!userIds.length) return new Map();
  const rows = await tx.contactCollaborator.findMany({ where: { contactId, userId: { in: [...userIds] } }, select: { userId: true, role: true } });
  return new Map(rows.map((r) => [r.userId, r.role]));
}

/** Điều kiện SQL "người xem có quan hệ đủ cho chế độ này với khách ở cột `contactCol`" (cột do server định nghĩa). */
export function grantSql(me: string, contactCol: Prisma.Sql, mode: AccessMode): Prisma.Sql {
  const role = mode === 'write' ? Prisma.sql` AND cc.role = 'collaborator'` : Prisma.empty;
  return Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = ${contactCol}${role})`;
}
