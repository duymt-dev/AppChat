// Quyền trên ticket (rbac-permissions §5, Blueprint §3.5): data scope `support` theo người phụ trách ticket — own = ticket giao cho mình
// (hoặc mình tạo), team = của thành viên cùng nhóm, all / none. Không thấy → 404 (không lộ tồn tại).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.support);

export type TicketRecord = NonNullable<Awaited<ReturnType<TenantTx['ticket']['findUnique']>>>;

/** Điều kiện SQL (alias `t`) theo scope support. */
export function supportScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const mine = Prisma.sql`(t.created_by_type = 'user' AND t.created_by_id = ${me})`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(t.assignee_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${mine})`;
  }
  return Prisma.sql`(t.assignee_user_id = ${me}::uuid OR ${mine})`;
}

export function inSupportScope(authz: AuthzContext, t: Pick<TicketRecord, 'assigneeUserId' | 'createdByType' | 'createdById'>): boolean {
  const l = level(authz);
  if (l === 'all') return true;
  if (l === 'none') return false;
  const me = authz.userId;
  if (t.assigneeUserId === me || (t.createdByType === 'user' && t.createdById === me)) return true;
  return l === 'team' && !!t.assigneeUserId && (authz.teamUserIds ?? []).includes(t.assigneeUserId);
}

export async function visibleTicket(tx: TenantTx, authz: AuthzContext, id: string): Promise<TicketRecord> {
  const t = UUID.test(id) ? await tx.ticket.findUnique({ where: { id } }) : null;
  if (!t || !inSupportScope(authz, t)) throw new AppError('NOT_FOUND', 404, { ticket_id: 'not_found' });
  return t;
}

/** Khoá dòng ticket (concurrency §2) rồi kiểm scope. */
export async function lockTicket(tx: TenantTx, authz: AuthzContext, id: string): Promise<TicketRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM ticket WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleTicket(tx, authz, id);
}
