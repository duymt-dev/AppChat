// Quyền trên lịch hẹn (rbac-permissions §5, Blueprint §3.5): data scope `booking` theo người phụ trách lịch (= phụ trách khách lúc đặt)
// — own = lịch mình phụ trách hoặc của khách mình là collaborator; team = của thành viên cùng nhóm; all / none. Không thấy → 404.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.booking);

/** Điều kiện SQL (alias `a`) cho danh sách theo scope booking. */
export function bookingScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const collab = Prisma.sql`EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = ${me}::uuid AND cc.contact_id = a.contact_id AND cc.role = 'collaborator')`;
  if (l === 'team') {
    const ids = [...new Set([me, ...(authz.teamUserIds ?? [])])];
    return Prisma.sql`(a.owner_user_id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) OR ${collab})`;
  }
  return Prisma.sql`(a.owner_user_id = ${me}::uuid OR ${collab})`;
}

export type AppointmentRecord = NonNullable<Awaited<ReturnType<TenantTx['appointment']['findUnique']>>>;

export async function inBookingScope(tx: TenantTx, authz: AuthzContext, ownerUserId: string | null, contactId: string): Promise<boolean> {
  const l = level(authz);
  if (l === 'all') return true;
  if (l === 'none') return false;
  const me = authz.userId;
  if (ownerUserId === me) return true;
  if (l === 'team' && ownerUserId && (authz.teamUserIds ?? []).includes(ownerUserId)) return true;
  const cc = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId, userId: me } }, select: { role: true } });
  return cc?.role === 'collaborator';
}

export async function visibleAppointment(tx: TenantTx, authz: AuthzContext, id: string): Promise<AppointmentRecord> {
  const a = UUID.test(id) ? await tx.appointment.findUnique({ where: { id } }) : null;
  if (!a || a.deletedAt || !(await inBookingScope(tx, authz, a.ownerUserId, a.contactId))) throw new AppError('NOT_FOUND', 404, { appointment_id: 'not_found' });
  return a;
}

/** Khoá dòng lịch (concurrency §2) rồi kiểm scope. */
export async function lockAppointment(tx: TenantTx, authz: AuthzContext, id: string): Promise<AppointmentRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleAppointment(tx, authz, id);
}
