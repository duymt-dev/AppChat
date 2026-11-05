// Quyền trên ticket (rbac-permissions §5, Blueprint §3.5, TIP-042c): data scope `support` theo người phụ trách ticket — bảng chân trị
// chung `authz/data-access` nhưng KHÔNG mở theo quan hệ khách CRM: none chặn trước; own = ticket giao cho mình hoặc mình tạo; team = thêm
// `team_id` ticket ∈ nhóm mình (DC-299); all. Không thấy → 404 (không lộ tồn tại); thấy mà scope ghi hẹp hơn → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../kernel/actions/action-context';
import { POLICIES, decide, recordScopeSql, type AccessMode } from '../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TicketRecord = NonNullable<Awaited<ReturnType<TenantTx['ticket']['findUnique']>>>;

const COLS = {
  assignee: Prisma.raw('t.assignee_user_id'),
  team: Prisma.raw('t.team_id'),
  teamText: true,
  mine: (me: string) => Prisma.sql`(t.created_by_type = 'user' AND t.created_by_id = ${me})`,
};

/** Điều kiện SQL (alias `t`) theo scope support. */
export function supportScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.support, mode, COLS);
}

type Ref = Pick<TicketRecord, 'assigneeUserId' | 'createdByType' | 'createdById'> & { teamId?: string | null };

export function inSupportScope(authz: AuthzContext, t: Ref, mode: AccessMode = 'read'): boolean {
  const mine = t.createdByType === 'user' && t.createdById === authz.userId;
  return decide(authz, POLICIES.support, mode, { assignee: t.assigneeUserId, team: t.teamId ?? null, mine }) === true;
}

/** Ticket người gọi thấy được — `mode = write` cho handler ghi / preview của action ghi. */
export async function visibleTicket(tx: TenantTx, authz: AuthzContext, id: string, mode: AccessMode = 'read'): Promise<TicketRecord> {
  const t = UUID.test(id) ? await tx.ticket.findUnique({ where: { id } }) : null;
  if (!t || !inSupportScope(authz, t)) throw new AppError('NOT_FOUND', 404, { ticket_id: 'not_found' });
  if (mode === 'write' && !inSupportScope(authz, t, 'write')) throw new AppError('SCOPE_FORBIDDEN', 403, { scope: 'support' });
  return t;
}

/** Khoá dòng ticket (concurrency §2) rồi kiểm quyền GHI. */
export async function lockTicket(tx: TenantTx, authz: AuthzContext, id: string): Promise<TicketRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM ticket WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleTicket(tx, authz, id, 'write');
}
