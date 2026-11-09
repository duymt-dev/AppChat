// Mock Đơn hàng (Blueprint §4.4 sales; COMMERCE-DECISIONS §4, §4b): GET /orders?chip=&owner_id=&value=&source=&q=, /orders/meta
// (?order_id= → thẻ CRM / nhận định / tệp của đơn đó), /orders/:id — cùng shape với API thật (packages/shared/src/api/orders.ts).
// Dữ liệu = prototype L7788 (fixture sinh bởi tools/scripts/fixtures/gen-orders.py, mã `DH-` — D52). 2 trục: status + pay_status
// (`payStatusOf` dùng chung với server). Ghi: orders-actions.ts.
import { ApiRequestError, ROLE_DEFS, payStatusOf, quoteTotals, type Discount, type ErrorCode, type PayStatusKey } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/orders.json';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import type { QuoteItem } from './quotes';
import { paginate } from '../paginate';
import { withEditFields } from './commerce-edit';

type Fixed = (typeof fixture.orders)[number];
export type OrderStatus = 'new' | 'processing' | 'completed' | 'cancelled';
export interface OrderEvent {
  type: string;
  at: string;
  actor: string;
  amount?: string;
  points?: number;
  reason?: string;
}
export type Order = Omit<
  Fixed,
  'status' | 'items' | 'header_discount' | 'events' | 'external' | 'quote_id' | 'contract_id' | 'source'
> & {
  source: 'manual' | 'quote' | 'contract' | 'appointment' | 'marketplace' | 'pos';
  status: OrderStatus;
  items: QuoteItem[];
  header_discount: Discount | null;
  events: OrderEvent[];
  external: { platform: string; external_id: string; platform_status: string } | null;
  quote_id: string | null;
  contract_id: string | null;
  refunded_total?: string;
  deleted?: boolean;
  /** TIP-032c: người phụ trách vận hành + phiên bản dòng (seed: withEditFields). */
  assigned_user_id?: string;
  assigned_name?: string;
  version?: number;
};

export interface OrdersState {
  orders: Order[];
  /** Số thứ tự mã DH- tiếp theo (D52). */
  seq: number;
}

export const createOrdersState = (): OrdersState => ({
  orders: withEditFields(structuredClone(fixture.orders) as Order[]),
  seq: 290411,
});

export const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương', u_khoa: 'Khoa' };

/** pay_status tổng hợp — cùng hàm với server (COMMERCE §4: Chờ cọc chỉ khi deposit_required). */
export const payStatus = (o: Order, total: number | string): PayStatusKey =>
  payStatusOf({
    status: o.status,
    total: String(total),
    paid: o.paid_total,
    refunded: o.refunded_total ?? '0',
    depositRequired: o.deposit_required,
    depositAmount: o.deposit_amount,
  });

/** Chip lọc của prototype (Tất cả · Đã thanh toán · Đã cọc · Chờ cọc · Đã huỷ) — mỗi chip lọc đúng trục của nó. */
const CHIP: Record<string, (o: ReturnType<typeof enrichOrder>) => boolean> = {
  paid: (o) => o.status !== 'cancelled' && o.pay_status === 'paid',
  deposit: (o) => o.status !== 'cancelled' && o.pay_status === 'deposited',
  pending: (o) => o.status !== 'cancelled' && o.pay_status === 'awaiting_deposit',
  cancelled: (o) => o.status === 'cancelled',
};

export const enrichOrder = (o: Order) => {
  const t = quoteTotals(o.items, o.header_discount);
  const totals = { subtotal: t.subtotal, discount_total: t.discount_total, tax_total: t.tax_total, total: t.total };
  const rest = { ...o };
  delete rest.deleted;
  delete rest.refunded_total;
  return { ...rest, ...totals, pay_status: payStatus(o, t.total) };
};

export const visible = (db: MockDb, o: Order) => {
  if (o.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.sales;
  return scope === 'all' || (scope === 'own' && o.assigned_user_id === ME);
};

export const findOrder = (db: MockDb, id: string) => {
  const o = db.orders.orders.find((x) => x.id === id && !x.deleted);
  if (!o || !visible(db, o)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return o;
};
export const deny = (code: ErrorCode, message: string): never => {
  throw new ApiRequestError(409, { code, message });
};
export const logOrder = (o: Order, type: string, extra: Partial<OrderEvent> = {}) =>
  o.events.push({ type, at: MOCK_NOW, actor: NAMES[ME]!, ...extra });

const VALUE: Record<string, (v: number) => boolean> = {
  lt5: (v) => v < 5_000_000,
  '5to20': (v) => v >= 5_000_000 && v <= 20_000_000,
  gt20: (v) => v > 20_000_000,
};

export const ordersRoutes: Record<string, MockRoute> = {
  '/orders': (db, p) => {
    const s = String(p.q ?? '')
      .trim()
      .toLowerCase();
    const rows = db.orders.orders
      .filter((o) => visible(db, o))
      .map(enrichOrder)
      .filter(
        (o) =>
          (!p.chip || p.chip === 'all' || (CHIP[String(p.chip)]?.(o) ?? true)) &&
          (!p.owner_id || p.owner_id === 'all' || o.owner_user_id === p.owner_id) &&
          (!p.assigned_user_id || p.assigned_user_id === 'all' || o.assigned_user_id === p.assigned_user_id) &&
          (!p.value || p.value === 'all' || (VALUE[String(p.value)]?.(Number(o.total)) ?? true)) &&
          (!p.source || p.source === 'all' || o.source === p.source) &&
          (!s || [o.code, o.contact_name, o.items[0]?.name ?? ''].some((v) => v.toLowerCase().includes(s))),
      );
    return paginate(rows, p);
  },
  '/orders/meta': (db, p) => {
    const all = db.orders.orders.filter((o) => visible(db, o)).map(enrichOrder);
    const counts: Record<string, number> = { all: all.length };
    for (const [k, f] of Object.entries(CHIP)) counts[k] = all.filter(f).length;
    const revenue = all.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + Number(o.paid_total), 0);
    return {
      counts,
      stats: { total: all.length, paid: counts.paid ?? 0, pending: counts.pending ?? 0, revenue: String(revenue) },
      // Thẻ CRM / nhận định / tệp theo đơn (`?order_id=`); không có thì để trống như server.
      ...(p.order_id
        ? { crm: fixture.crm, insight: fixture.insight, files: fixture.files }
        : { crm: { ltv: '0', total: 0, tier: '', points: 0 }, insight: '', files: [] }),
      ai_runs: fixture.ai_runs,
    };
  },
};

export const ordersParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/orders\/(ord_[^/]+)$/);
  if (!m) return undefined;
  return (db) => enrichOrder(findOrder(db, m[1]!));
};
