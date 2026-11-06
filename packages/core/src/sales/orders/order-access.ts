// Quyền trên đơn (rbac-permissions §5, COMMERCE §8b, D32, TIP-042c): data scope `sales` theo người phụ trách đơn — bảng chân trị chung
// `authz/data-access`: none chặn trước; own = đơn mình phụ trách hoặc của khách mình là collaborator / watcher (ĐỌC; GHI chỉ collaborator);
// team = thêm `team_id` đơn ∈ nhóm mình (DC-299); all. Không đọc được → 404 (không lộ tồn tại — rbac §9); đọc được mà không ghi
// được (watcher / scope ghi hẹp hơn) → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, docColumns, guardRecord, recordScopeSql, type AccessMode } from '../../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLS = docColumns('o');
const NF = { order_id: 'not_found' };

/** Điều kiện SQL (alias `o`) cho danh sách theo scope sales. */
export function orderScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.sales, mode, COLS);
}

export type OrderRecord = NonNullable<Awaited<ReturnType<TenantTx['order']['findUnique']>>>;

/** Đơn người gọi thấy được (chưa xoá) — `mode = write` cho handler ghi / preview của action ghi. */
export async function visibleOrder(tx: TenantTx, authz: AuthzContext, id: string, mode: AccessMode = 'read'): Promise<OrderRecord> {
  const o = UUID.test(id) ? await tx.order.findUnique({ where: { id } }) : null;
  if (!o || o.deletedAt) throw new AppError('NOT_FOUND', 404, NF);
  await guardRecord(tx, authz, POLICIES.sales, mode, { owner: o.ownerUserId, team: o.teamId, contact: o.contactId }, NF);
  return o;
}

/** Khoá dòng đơn cho chuyển trạng thái / đổi tiền (concurrency §2) rồi kiểm quyền GHI. */
export async function lockOrder(tx: TenantTx, authz: AuthzContext, id: string): Promise<OrderRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleOrder(tx, authz, id, 'write');
}
