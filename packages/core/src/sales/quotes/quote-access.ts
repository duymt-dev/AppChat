// Quyền trên báo giá (rbac-permissions §5, COMMERCE §8b, D32): data scope `sales` theo phụ trách báo giá — own = báo giá mình phụ trách
// hoặc của khách mình là collaborator; team = của thành viên cùng nhóm; all / none. Không thấy → 404 (không lộ tồn tại — rbac §9).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.sales);

/** Điều kiện SQL (alias `q`) cho danh sách theo scope sales. */
export function quoteScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const collab = Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = q.contact_id AND cc.role = 'collaborator')`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(q.owner_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${collab})`;
  }
  return Prisma.sql`(q.owner_user_id = ${me}::uuid OR ${collab})`;
}

type QuoteRecord = NonNullable<Awaited<ReturnType<TenantTx['quote']['findUnique']>>>;

/** Báo giá người gọi thấy được (chưa xoá). */
export async function visibleQuote(tx: TenantTx, authz: AuthzContext, id: string): Promise<QuoteRecord> {
  const q = UUID.test(id) ? await tx.quote.findUnique({ where: { id } }) : null;
  if (!q || q.deletedAt) throw new AppError('NOT_FOUND', 404, { quote_id: 'not_found' });
  const l = level(authz);
  if (l === 'all') return q;
  const me = authz.userId;
  if (q.ownerUserId === me) return q;
  if (l === 'team' && q.ownerUserId && (authz.teamUserIds ?? []).includes(q.ownerUserId)) return q;
  if (l !== 'none') {
    const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: q.contactId, userId: me } }, select: { role: true } });
    if (cc?.role === 'collaborator') return q;
  }
  throw new AppError('NOT_FOUND', 404, { quote_id: 'not_found' });
}

/** Khoá dòng báo giá cho chuyển trạng thái (concurrency §2) rồi kiểm scope. */
export async function lockQuote(tx: TenantTx, authz: AuthzContext, id: string): Promise<QuoteRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM quote WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleQuote(tx, authz, id);
}

export type { QuoteRecord };
