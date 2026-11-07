// Quyền trên một khách (rbac-permissions §5, D32, TIP-042c): data scope `crm` + phụ trách chính + collaborator / watcher + nhóm.
// Bảng chân trị dùng chung `authz/data-access` (record-policy): none chặn trước mọi nhánh; own → mình phụ trách hoặc có quan hệ;
// team → thêm `team_id` của khách ∈ nhóm mình (DC-299). Đọc: owner / collaborator / watcher / scope đọc; ghi: owner / collaborator /
// scope GHI (CSKH: đọc all, ghi own — Blueprint §3.5) — watcher không bao giờ là bằng chứng ghi.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, decide, grantAllows, grantOf, guardRecord, recordScopeSql, type AccessMode } from '../../authz/data-access';

export type ContactAccess = 'owner' | 'collaborator' | 'watcher' | 'scope';

interface Row {
  id: string;
  ownerUserId: string | null;
  teamId?: string | null;
  deletedAt?: Date | null;
}

const COLS = { owner: Prisma.raw('c.owner_user_id'), team: Prisma.raw('c.team_id'), contact: Prisma.raw('c.id') };
const ref = (c: Row) => ({ owner: c.ownerUserId, team: c.teamId ?? null, contact: c.id });

/** Điều kiện SQL (alias `c`) cho danh sách theo scope crm — quan hệ khách qua `contact_collaborator (user_id, contact_id) INCLUDE (role)`. */
export function scopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.crm, mode, COLS);
}

/** Vai trò của người xem trên khách (null = không thấy) + có được ghi không. */
export async function accessOf(tx: TenantTx, authz: AuthzContext, c: Row): Promise<{ access: ContactAccess; writable: boolean } | null> {
  const grant = await grantOf(tx, c.id, authz.userId);
  const read = decide(authz, POLICIES.crm, 'read', ref(c), grant);
  if (read !== true) return null;
  const writable = decide(authz, POLICIES.crm, 'write', ref(c), grant) === true;
  const owner = c.ownerUserId === authz.userId;
  // Watcher đọc được nhờ quan hệ hoặc scope; ghi chỉ khi có grant độc lập (scope ghi / owner) — `writable` đã tính đúng thứ tự đó.
  return { access: owner ? 'owner' : (grant ?? 'scope'), writable };
}

/** Khách còn hiệu lực + người gọi thấy được; không thấy → 404 (không lộ tồn tại — rbac §9). */
export async function visibleContact(tx: TenantTx, authz: AuthzContext, id: string) {
  const c = UUID.test(id) ? await tx.contact.findUnique({ where: { id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  const a = await accessOf(tx, authz, c);
  if (!a) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  return { contact: c, access: a.access, writable: a.writable };
}

/** Khách người gọi được sửa: thấy được + scope ghi / owner / collaborator → ngược lại 403 SCOPE_FORBIDDEN (watcher chỉ đọc). */
export async function editableContact(tx: TenantTx, authz: AuthzContext, id: string) {
  const c = UUID.test(id) ? await tx.contact.findUnique({ where: { id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  await guardRecord(tx, authz, POLICIES.crm, 'write', ref(c), { contact_id: 'not_found' });
  const grant = c.ownerUserId === authz.userId ? null : await grantOf(tx, c.id, authz.userId);
  return { contact: c, access: (c.ownerUserId === authz.userId ? 'owner' : grantAllows(grant, 'write') ? 'collaborator' : 'scope') as ContactAccess, writable: true };
}

/** Quản lý quan hệ phụ trách của khách: owner của khách hoặc `crm.reassign`. */
export function canManageCollaborators(authz: AuthzContext, c: Row): boolean {
  return authz.isOwner || authz.permissions.has('crm.reassign') || c.ownerUserId === authz.userId;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Người thực hiện của action (user gốc khi Trợ lý / agent làm thay). */
export const actorUserId = (ctx: { onBehalfOfUserId?: string; actor: { type: string; id: string } }) =>
  ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
