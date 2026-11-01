// Quyền trên đề nghị thanh toán (rbac-permissions §5, COMMERCE §8b): data scope `sales` theo người phụ trách (theo đơn — hoặc người tạo
// khi không gắn đơn); own = của mình hoặc của khách mình là collaborator; team = cùng nhóm. Không thấy → 404 (rbac §9).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.sales);

/** Điều kiện SQL (alias `i`) cho danh sách theo scope sales. */
export function invoiceScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const collab = Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = i.contact_id AND cc.role = 'collaborator')`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(i.owner_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${collab})`;
  }
  return Prisma.sql`(i.owner_user_id = ${me}::uuid OR ${collab})`;
}

export type InvoiceRecord = NonNullable<Awaited<ReturnType<TenantTx['invoice']['findUnique']>>>;

/** Người gọi thấy chủ sở hữu + khách này không (dùng chung đề nghị / liệu trình). */
export async function inSalesScope(tx: TenantTx, authz: AuthzContext, ownerUserId: string | null, contactId: string): Promise<boolean> {
  const l = level(authz);
  if (l === 'all') return true;
  if (l === 'none') return false;
  const me = authz.userId;
  if (ownerUserId === me) return true;
  if (l === 'team' && ownerUserId && (authz.teamUserIds ?? []).includes(ownerUserId)) return true;
  const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId, userId: me } }, select: { role: true } });
  return cc?.role === 'collaborator';
}

export async function visibleInvoice(tx: TenantTx, authz: AuthzContext, id: string): Promise<InvoiceRecord> {
  const i = UUID.test(id) ? await tx.invoice.findUnique({ where: { id } }) : null;
  if (!i || !(await inSalesScope(tx, authz, i.ownerUserId, i.contactId))) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
  return i;
}

/** Khoá dòng đề nghị (concurrency §2) rồi kiểm scope. */
export async function lockInvoice(tx: TenantTx, authz: AuthzContext, id: string): Promise<InvoiceRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleInvoice(tx, authz, id);
}
