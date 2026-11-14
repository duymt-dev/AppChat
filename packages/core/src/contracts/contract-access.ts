// Quyền trên hợp đồng (rbac-permissions §5, COMMERCE §9, D32, TIP-042c): data scope `sales` theo người làm hợp đồng — bảng chân trị chung
// `authz/data-access`: none chặn trước; own = hợp đồng mình làm hoặc của khách mình là collaborator / watcher (ĐỌC; GHI chỉ collaborator);
// team = thêm `team_id` ∈ nhóm mình (DC-299); all. Không đọc được → 404 (không lộ tồn tại — rbac §9); đọc được mà không ghi được
// (watcher / scope ghi hẹp hơn) → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../kernel/actions/action-context';
import { POLICIES, docColumns, guardRecord, recordScopeSql, type AccessMode } from '../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// TIP-032c §1.5: nhánh own theo người phụ trách VẬN HÀNH (`assigned_user_id`), không theo người tạo (doanh số không phải quyền ghi vĩnh viễn).
const COLS = { ...docColumns('c'), owner: Prisma.raw('c.assigned_user_id') };
const NF = { contract_id: 'not_found' };

/** Điều kiện SQL (alias `c`) cho danh sách theo scope sales. */
export function contractScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.sales, mode, COLS);
}

export type ContractRecord = NonNullable<Awaited<ReturnType<TenantTx['contract']['findUnique']>>>;

/** Hợp đồng người gọi thấy được (chưa xoá) — `mode = write` cho handler ghi / preview của action ghi. */
export async function visibleContract(tx: TenantTx, authz: AuthzContext, id: string, mode: AccessMode = 'read'): Promise<ContractRecord> {
  const c = UUID.test(id) ? await tx.contract.findUnique({ where: { id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, NF);
  await guardRecord(tx, authz, POLICIES.sales, mode, { owner: c.assignedUserId, team: c.teamId, contact: c.contactId }, NF);
  return c;
}

/** Khoá dòng hợp đồng cho chuyển trạng thái (concurrency §2) rồi kiểm quyền GHI. */
export async function lockContract(tx: TenantTx, authz: AuthzContext, id: string): Promise<ContractRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM contract WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleContract(tx, authz, id, 'write');
}
