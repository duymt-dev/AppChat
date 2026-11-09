// Truy vấn liệu trình có quyền (TIP-033b §4.1, §4.3): quyền nằm TRONG SQL trước LIMIT. Trang theo khách: người gọi đã kiểm khách gốc
// thấy được (visibleContact) → `contact_id ∈ họ(gốc)` (gốc + nguồn đã gộp — gói giữ contact_id gốc của nó, mỗi gói một lần theo id) +
// đơn sinh ra gói đọc được theo scope bán hàng (o: người phụ trách đơn / nhóm / quyền theo khách); không vòng kiểm từng gói. Chọn id theo
// (created_at DESC, id DESC) rồi nạp payload cho đúng trang (deferred join). Chiếu theo lô id (lịch hẹn): thêm scope CRM của khách sở hữu
// gói (c, khách còn sống). `order_visible` chỉ đúng khi người xem có order.view (order_id bị che nếu không).
import { TenantSql as Prisma } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { POLICIES, docColumns, recordScopeSql } from '../../../authz/data-access';
import { crmScopeSql, inFamilySql } from '../../../crm/public';
import type { PackageRow } from './projection';

const ORDER_COLS = { ...docColumns('o'), owner: Prisma.raw('o.assigned_user_id') };

export interface PackageQuery {
  /** Khách gốc người gọi ĐÃ kiểm thấy được — đọc theo họ của khách này. */
  rootId: string;
  status?: string;
  /** Lọc theo dịch vụ hiện hành: gói có thành phần là dịch vụ này hoặc gói không ghi thành phần (cùng luật appointment-write). */
  serviceId?: string;
  after?: { createdAt: Date; id: string };
  limit: number;
}

const canSeeOrder = (authz: AuthzContext) => authz.isOwner || authz.permissions.has('order.view');

const salesSql = (authz: AuthzContext) => recordScopeSql(authz, POLICIES.sales, 'read', ORDER_COLS);

export async function packagePage(tx: TenantTx, authz: AuthzContext, q: PackageQuery): Promise<PackageRow[]> {
  const status = q.status ? Prisma.sql`AND p.status = ${q.status}::"package_status"` : Prisma.empty;
  const svc = q.serviceId
    ? Prisma.sql`AND (NOT EXISTS (SELECT 1 FROM product_component pc WHERE pc.product_id = p.product_id) OR EXISTS (SELECT 1 FROM product_component pc WHERE pc.product_id = p.product_id AND pc.child_id = ${q.serviceId}::uuid))`
    : Prisma.empty;
  const seek = q.after ? Prisma.sql`AND (p.created_at, p.id) < (${q.after.createdAt}, ${q.after.id}::uuid)` : Prisma.empty;
  const ids = await tx.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM customer_package p
    JOIN "order" o ON o.id = p.order_id
    WHERE ${inFamilySql('p.contact_id', q.rootId)} AND ${salesSql(authz)} ${status} ${svc} ${seek}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${q.limit}`;
  return ids.length ? rowsOf(tx, authz, ids.map((r) => r.id)) : [];
}

/** Tập id chốt cho tệp xuất (TIP-033b §5.1): cùng điều kiện trang theo khách (họ + scope đơn trong SQL), không seek, tối đa `cap`. */
export async function packageIds(tx: TenantTx, authz: AuthzContext, q: { rootId: string; status?: string; cap: number }): Promise<string[]> {
  const status = q.status ? Prisma.sql`AND p.status = ${q.status}::"package_status"` : Prisma.empty;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM customer_package p
    JOIN "order" o ON o.id = p.order_id
    WHERE ${inFamilySql('p.contact_id', q.rootId)} AND ${salesSql(authz)} ${status}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${q.cap}`;
  return rows.map((r) => r.id);
}

/** Payload cho tập id đã lọc quyền (giữ thứ tự created_at DESC, id DESC). */
async function rowsOf(tx: TenantTx, authz: AuthzContext, ids: readonly string[]): Promise<PackageRow[]> {
  const orderOk = canSeeOrder(authz);
  return tx.$queryRaw<PackageRow[]>`
    SELECT p.id, p.contact_id, p.product_id, p.order_id, p.name, p.total_sessions, p.used_sessions, p.status::text AS status, p.expires_at,
           p.created_at, ${orderOk}::boolean AS order_visible
    FROM customer_package p WHERE p.id = ANY(${ids}::uuid[])
    ORDER BY p.created_at DESC, p.id DESC`;
}

/** Chiếu theo lô id gói (lịch hẹn): chỉ trả gói người xem được đọc (khách CRM + đơn sales) — gói bị chặn không có trong kết quả. */
export async function packagesById(tx: TenantTx, authz: AuthzContext, ids: readonly string[]): Promise<PackageRow[]> {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return [];
  const ok = await tx.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM customer_package p
    JOIN contact c ON c.id = p.contact_id
    JOIN "order" o ON o.id = p.order_id
    WHERE p.id = ANY(${uniq}::uuid[]) AND c.deleted_at IS NULL AND ${crmScopeSql(authz)} AND ${salesSql(authz)}`;
  return ok.length ? rowsOf(tx, authz, ok.map((r) => r.id)) : [];
}
