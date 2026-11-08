// KPI Hồ sơ 360° (TIP-015b mục 4, COMMERCE §5 / §11): công nợ (customer-debt — cùng công thức với hợp đồng / đề nghị), hợp đồng hiệu lực (signed,
// chưa quá ngày kết thúc) + tổng giá trị + ngày hết hạn gần nhất, đơn gần nhất, khoản thu gần nhất, LTV = thu ròng đã xác nhận (khoản thu
// dương confirmed + hoàn tiền âm confirmed — mỗi dòng sổ đúng một lần; đơn huỷ chưa hoàn không làm mất tiền đã thu; báo giá / đơn nháp không
// phải doanh thu). Mỗi phần kiểm quyền module + scope bản ghi của người xem; không quyền → `null` (unavailable ≠ 0). Gom số không bị LIMIT.
import { TenantSql as Prisma } from '@appchat/db';
import { can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { contractScopeSql } from '../../contracts/contract-access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { invoiceScopeSql } from '../../sales/payments/invoice-access';
import { customerDebt, type Debt } from './customer-debt';
import { inFamilySql } from '../lifecycle/family-sql';

export interface ContractKpi {
  active: number;
  value: string;
  /** Ngày hết hạn gần nhất của HĐ hiệu lực (YYYY-MM-DD) hoặc ''. */
  next_end: string;
}
export interface RecentDoc {
  id: string;
  code: string;
  status: string;
  amount: string;
  at: string;
}
export interface CustomerKpis {
  debt: Debt | null;
  contracts: ContractKpi | null;
  recent_order: RecentDoc | null | undefined;
  recent_payment: RecentDoc | null | undefined;
  /** Thu ròng đã xác nhận (VND) — null khi không có quyền xem khoản thu. */
  ltv: string | null;
}

type Tx = Pick<TenantTx, '$queryRaw'>;

async function contractKpi(tx: Tx, a: AuthzContext, id: string, today: string): Promise<ContractKpi | null> {
  if (!can(a, 'contract.view')) return null;
  const [r] = await tx.$queryRaw<{ n: bigint; value: bigint | null; next_end: Date | null }[]>`
    SELECT count(*)::bigint AS n, sum(c.value)::bigint AS value, min(c.end_date) AS next_end FROM contract c
    WHERE ${inFamilySql('c.contact_id', id)} AND c.deleted_at IS NULL AND c.status = 'signed' AND (c.end_date IS NULL OR c.end_date >= ${today}::date)
      AND ${contractScopeSql(a)}`;
  return { active: Number(r?.n ?? 0n), value: String(r?.value ?? 0n), next_end: r?.next_end ? r.next_end.toISOString().slice(0, 10) : '' };
}

/** Đơn gần nhất (không gồm đơn đã xoá); không quyền → undefined. Index order_contact_idx (contact_id, created_at DESC) INCLUDE (status, total). */
async function recentOrder(tx: Tx, a: AuthzContext, id: string): Promise<RecentDoc | null | undefined> {
  if (!can(a, 'order.view')) return undefined;
  const [o] = await tx.$queryRaw<{ id: string; code: string; status: string; total: bigint; created_at: Date }[]>`
    SELECT o.id, o.code, o.status::text AS status, o.total, o.created_at FROM "order" o
    WHERE ${inFamilySql('o.contact_id', id)} AND o.deleted_at IS NULL AND ${orderScopeSql(a)}
    ORDER BY o.created_at DESC, o.id DESC LIMIT 1`;
  return o ? { id: o.id, code: o.code, status: o.status, amount: String(o.total), at: o.created_at.toISOString() } : null;
}

/** Khoản thu (alias p) trong scope: theo đề nghị (i) nếu gắn đề nghị, theo đơn (o) nếu chỉ gắn đơn; không gắn gì → chỉ scope sales `all`. */
const paymentScope = (a: AuthzContext) =>
  Prisma.sql`((i.id IS NOT NULL AND ${invoiceScopeSql(a)}) OR (i.id IS NULL AND o.id IS NOT NULL AND ${orderScopeSql(a)}) OR (i.id IS NULL AND o.id IS NULL AND ${a.isOwner || a.scope.sales === 'all'}))`;

/** Khoản thu dương xác nhận gần nhất + LTV (thu ròng, điểm không tính tiền). Quyền `invoice.manage` hoặc `payment.record`. */
async function payments(tx: Tx, a: AuthzContext, id: string): Promise<{ recent: RecentDoc | null; ltv: string } | null> {
  if (!can(a, 'invoice.manage') && !can(a, 'payment.record')) return null;
  const from = Prisma.sql`FROM customer_payment p LEFT JOIN invoice i ON i.id = p.invoice_id LEFT JOIN "order" o ON o.id = p.order_id
    WHERE ${inFamilySql('p.contact_id', id)} AND p.status = 'confirmed' AND p.kind <> 'points' AND ${paymentScope(a)}`;
  const [sum, last] = await Promise.all([
    tx.$queryRaw<{ ltv: bigint }[]>`SELECT coalesce(sum(p.amount), 0)::bigint AS ltv ${from}`,
    tx.$queryRaw<{ id: string; code: string | null; kind: string; amount: bigint; paid_at: Date }[]>`
      SELECT p.id, p.receipt_code AS code, p.kind::text AS kind, p.amount, p.paid_at ${from} AND p.amount > 0 ORDER BY p.paid_at DESC, p.id DESC LIMIT 1`,
  ]);
  const r = last[0];
  return { recent: r ? { id: r.id, code: r.code ?? '', status: r.kind, amount: String(r.amount), at: r.paid_at.toISOString() } : null, ltv: String(sum[0]?.ltv ?? 0n) };
}

export async function customerKpis(tx: Tx, a: AuthzContext, contactId: string, today: string): Promise<CustomerKpis> {
  const [debt, contracts, order, pay] = await Promise.all([customerDebt(tx, a, contactId, today), contractKpi(tx, a, contactId, today), recentOrder(tx, a, contactId), payments(tx, a, contactId)]);
  return { debt, contracts, recent_order: order, recent_payment: pay ? pay.recent : undefined, ltv: pay ? pay.ltv : null };
}
