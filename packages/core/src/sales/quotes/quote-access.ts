// Quyền trên báo giá (rbac-permissions §5, COMMERCE §8b, D32, TIP-042c): data scope `sales` theo phụ trách báo giá — bảng chân trị chung
// `authz/data-access`: none chặn trước; own = báo giá mình phụ trách hoặc của khách mình là collaborator / watcher (ĐỌC; GHI chỉ collaborator);
// team = thêm `team_id` báo giá ∈ nhóm mình (DC-299); all. Không đọc được → 404 (không lộ tồn tại — rbac §9); đọc được mà không ghi
// được (watcher / scope ghi hẹp hơn) → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, docColumns, guardRecord, recordScopeSql, type AccessMode } from '../../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLS = docColumns('q');
const NF = { quote_id: 'not_found' };

/** Điều kiện SQL (alias `q`) cho danh sách theo scope sales. */
export function quoteScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.sales, mode, COLS);
}

type QuoteRecord = NonNullable<Awaited<ReturnType<TenantTx['quote']['findUnique']>>>;

/** Báo giá người gọi thấy được (chưa xoá) — `mode = write` cho handler ghi / preview của action ghi. */
export async function visibleQuote(tx: TenantTx, authz: AuthzContext, id: string, mode: AccessMode = 'read'): Promise<QuoteRecord> {
  const q = UUID.test(id) ? await tx.quote.findUnique({ where: { id } }) : null;
  if (!q || q.deletedAt) throw new AppError('NOT_FOUND', 404, NF);
  await guardRecord(tx, authz, POLICIES.sales, mode, { owner: q.ownerUserId, team: q.teamId, contact: q.contactId }, NF);
  return q;
}

/** Khoá dòng báo giá cho chuyển trạng thái (concurrency §2) rồi kiểm quyền GHI. */
export async function lockQuote(tx: TenantTx, authz: AuthzContext, id: string): Promise<QuoteRecord> {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM quote WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleQuote(tx, authz, id, 'write');
}

export type { QuoteRecord };
