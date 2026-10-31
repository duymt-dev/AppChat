// Quyền trên hợp đồng (rbac-permissions §5, COMMERCE §9): data scope `sales` theo người làm hợp đồng — own = hợp đồng mình làm hoặc
// của khách mình là collaborator; team = của thành viên cùng nhóm; all / none. Không thấy → 404 (không lộ tồn tại — rbac §9).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.sales);

/** Điều kiện SQL (alias `c`) cho danh sách theo scope sales. */
export function contractScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const collab = Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = c.contact_id AND cc.role = 'collaborator')`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(c.owner_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${collab})`;
  }
  return Prisma.sql`(c.owner_user_id = ${me}::uuid OR ${collab})`;
}

export type ContractRecord = NonNullable<Awaited<ReturnType<TenantTx['contract']['findUnique']>>>;

/** Hợp đồng người gọi thấy được (chưa xoá). */
export async function visibleContract(tx: TenantTx, authz: AuthzContext, id: string): Promise<ContractRecord> {
  const c = UUID.test(id) ? await tx.contract.findUnique({ where: { id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contract_id: 'not_found' });
  const l = level(authz);
  if (l === 'all') return c;
  const me = authz.userId;
  if (c.ownerUserId === me) return c;
  if (l === 'team' && c.ownerUserId && (authz.teamUserIds ?? []).includes(c.ownerUserId)) return c;
  if (l !== 'none') {
    const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: c.contactId, userId: me } }, select: { role: true } });
    if (cc?.role === 'collaborator') return c;
  }
  throw new AppError('NOT_FOUND', 404, { contract_id: 'not_found' });
}

/** Khoá dòng hợp đồng cho chuyển trạng thái (concurrency §2) rồi kiểm scope. */
export async function lockContract(tx: TenantTx, authz: AuthzContext, id: string): Promise<ContractRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM contract WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleContract(tx, authz, id);
}
