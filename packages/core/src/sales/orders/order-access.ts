// Quyền trên đơn hàng (rbac-permissions §5, COMMERCE §8b, D32): data scope `sales` theo người phụ trách đơn — own = đơn mình phụ trách
// hoặc của khách mình là collaborator; team = của thành viên cùng nhóm; all / none. Không thấy → 404 (không lộ tồn tại — rbac §9).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.sales);

/** Điều kiện SQL (alias `o`) cho danh sách theo scope sales. */
export function orderScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const collab = Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = o.contact_id AND cc.role = 'collaborator')`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(o.owner_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${collab})`;
  }
  return Prisma.sql`(o.owner_user_id = ${me}::uuid OR ${collab})`;
}

export type OrderRecord = NonNullable<Awaited<ReturnType<TenantTx['order']['findUnique']>>>;

/** Đơn người gọi thấy được (chưa xoá). */
export async function visibleOrder(tx: TenantTx, authz: AuthzContext, id: string): Promise<OrderRecord> {
  const o = UUID.test(id) ? await tx.order.findUnique({ where: { id } }) : null;
  if (!o || o.deletedAt) throw new AppError('NOT_FOUND', 404, { order_id: 'not_found' });
  const l = level(authz);
  if (l === 'all') return o;
  const me = authz.userId;
  if (o.ownerUserId === me) return o;
  if (l === 'team' && o.ownerUserId && (authz.teamUserIds ?? []).includes(o.ownerUserId)) return o;
  if (l !== 'none') {
    const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: o.contactId, userId: me } }, select: { role: true } });
    if (cc?.role === 'collaborator') return o;
  }
  throw new AppError('NOT_FOUND', 404, { order_id: 'not_found' });
}

/** Khoá dòng đơn cho chuyển trạng thái / đổi tiền (concurrency §2) rồi kiểm scope. */
export async function lockOrder(tx: TenantTx, authz: AuthzContext, id: string): Promise<OrderRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleOrder(tx, authz, id);
}
