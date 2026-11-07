// Quyền trên đề nghị thanh toán (rbac-permissions §5, COMMERCE §8b, D32, TIP-042c): data scope `sales` theo người phụ trách (theo đơn — hoặc người tạo khi không gắn đơn) — bảng chân trị chung
// `authz/data-access`: none chặn trước; own = của mình hoặc của khách mình là collaborator / watcher (ĐỌC; GHI chỉ collaborator);
// team = thêm `team_id` ∈ nhóm mình (DC-299); all. Không đọc được → 404 (không lộ tồn tại — rbac §9); đọc được mà không ghi được
// (watcher / scope ghi hẹp hơn) → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, allows, docColumns, guardRecord, recordScopeSql, type AccessMode } from '../../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLS = docColumns('i');
const NF = { invoice_id: 'not_found' };

/** Điều kiện SQL (alias `i`) cho danh sách theo scope sales. */
export function invoiceScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.sales, mode, COLS);
}

export type InvoiceRecord = NonNullable<Awaited<ReturnType<TenantTx['invoice']['findUnique']>>>;

/** Bản ghi bán hàng (đề nghị / liệu trình theo đơn) trong scope sales của người gọi không — cùng policy với list. */
export function inSalesScope(tx: TenantTx, authz: AuthzContext, ref: { owner: string | null; team?: string | null; contact: string }, mode: AccessMode = 'read'): Promise<boolean> {
  return allows(tx, authz, POLICIES.sales, mode, { owner: ref.owner, team: ref.team ?? null, contact: ref.contact });
}

/** Đề nghị người gọi thấy được — `mode = write` cho handler ghi / preview của action ghi. */
export async function visibleInvoice(tx: TenantTx, authz: AuthzContext, id: string, mode: AccessMode = 'read'): Promise<InvoiceRecord> {
  const i = UUID.test(id) ? await tx.invoice.findUnique({ where: { id } }) : null;
  if (!i) throw new AppError('NOT_FOUND', 404, NF);
  await guardRecord(tx, authz, POLICIES.sales, mode, { owner: i.ownerUserId, team: i.teamId, contact: i.contactId }, NF);
  return i;
}

/** Khoá dòng đề nghị (concurrency §2) rồi kiểm quyền GHI. */
export async function lockInvoice(tx: TenantTx, authz: AuthzContext, id: string): Promise<InvoiceRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleInvoice(tx, authz, id, 'write');
}
