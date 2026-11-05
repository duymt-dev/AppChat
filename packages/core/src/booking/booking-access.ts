// Quyền trên lịch hẹn (rbac-permissions §5, Blueprint §3.5, D32, TIP-042c): data scope `booking` theo người phụ trách lịch (= phụ trách khách lúc đặt) — bảng chân trị chung
// `authz/data-access`: none chặn trước; own = lịch mình phụ trách hoặc của khách mình là collaborator / watcher (ĐỌC; GHI chỉ collaborator);
// team = thêm `team_id` ∈ nhóm mình (DC-299); all. Không đọc được → 404 (không lộ tồn tại — rbac §9); đọc được mà không ghi được
// (watcher / scope ghi hẹp hơn) → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../kernel/actions/action-context';
import { POLICIES, allows, docColumns, guardRecord, recordScopeSql, type AccessMode } from '../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLS = docColumns('a');
const NF = { appointment_id: 'not_found' };

/** Điều kiện SQL (alias `a`) cho danh sách theo scope booking. */
export function bookingScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.booking, mode, COLS);
}

export type AppointmentRecord = NonNullable<Awaited<ReturnType<TenantTx['appointment']['findUnique']>>>;

export function inBookingScope(tx: TenantTx, authz: AuthzContext, ref: { owner: string | null; team?: string | null; contact: string }, mode: AccessMode = 'read'): Promise<boolean> {
  return allows(tx, authz, POLICIES.booking, mode, { owner: ref.owner, team: ref.team ?? null, contact: ref.contact });
}

/** Lịch người gọi thấy được (chưa xoá) — `mode = write` cho handler ghi / preview của action ghi. */
export async function visibleAppointment(tx: TenantTx, authz: AuthzContext, id: string, mode: AccessMode = 'read'): Promise<AppointmentRecord> {
  const a = UUID.test(id) ? await tx.appointment.findUnique({ where: { id } }) : null;
  if (!a || a.deletedAt) throw new AppError('NOT_FOUND', 404, NF);
  await guardRecord(tx, authz, POLICIES.booking, mode, { owner: a.ownerUserId, team: a.teamId, contact: a.contactId }, NF);
  return a;
}

/** Khoá dòng lịch (concurrency §2) rồi kiểm quyền GHI. */
export async function lockAppointment(tx: TenantTx, authz: AuthzContext, id: string): Promise<AppointmentRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleAppointment(tx, authz, id, 'write');
}
