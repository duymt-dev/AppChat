// Quyền trên một khách (rbac-permissions §5, D32): data scope `crm` + phụ trách chính + collaborator / watcher.
// own  → khách mình phụ trách hoặc mình là collaborator / watcher; team → của thành viên cùng nhóm; all / none.
// Đọc: owner / collaborator / watcher / scope; ghi: owner / collaborator / scope ≠ own (watcher chỉ đọc).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export type ContactAccess = 'owner' | 'collaborator' | 'watcher' | 'scope';

interface Row {
  id: string;
  ownerUserId: string | null;
  deletedAt?: Date | null;
}

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.crm);

/** Điều kiện SQL (alias `c`) cho danh sách theo scope crm — own join `contact_collaborator` (index user_id, contact_id). */
export function scopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const collab = Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = c.id)`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(c.owner_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${collab})`;
  }
  return Prisma.sql`(c.owner_user_id = ${me}::uuid OR ${collab})`;
}

/** Vai trò của người xem trên khách (null = không thấy). */
export async function accessOf(tx: TenantTx, authz: AuthzContext, c: Row): Promise<ContactAccess | null> {
  const me = authz.userId;
  if (c.ownerUserId === me) return 'owner';
  const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: c.id, userId: me } }, select: { role: true } });
  const l = level(authz);
  if (l === 'all' || (l === 'team' && c.ownerUserId && (authz.teamUserIds ?? []).includes(c.ownerUserId))) return cc?.role ?? 'scope';
  return cc?.role ?? null;
}

/** Khách còn hiệu lực + người gọi thấy được; không thấy → 404 (không lộ tồn tại — rbac §9). */
export async function visibleContact(tx: TenantTx, authz: AuthzContext, id: string) {
  const c = UUID.test(id) ? await tx.contact.findUnique({ where: { id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  const access = await accessOf(tx, authz, c);
  if (!access) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  return { contact: c, access };
}

/** Khách người gọi được sửa: thấy được + không phải watcher → ngược lại 403 SCOPE_FORBIDDEN. */
export async function editableContact(tx: TenantTx, authz: AuthzContext, id: string) {
  const r = await visibleContact(tx, authz, id);
  if (r.access === 'watcher') throw new AppError('SCOPE_FORBIDDEN', 403, { scope: 'crm', access: 'watcher' });
  return r;
}

/** Quản lý quan hệ phụ trách của khách: owner của khách hoặc `crm.reassign`. */
export function canManageCollaborators(authz: AuthzContext, c: Row): boolean {
  return authz.isOwner || authz.permissions.has('crm.reassign') || c.ownerUserId === authz.userId;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Người thực hiện của action (user gốc khi Trợ lý / agent làm thay). */
export const actorUserId = (ctx: { onBehalfOfUserId?: string; actor: { type: string; id: string } }) =>
  ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
