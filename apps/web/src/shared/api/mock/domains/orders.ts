// Mock Đơn hàng (Blueprint §4.4 sales; COMMERCE-DECISIONS §4, §4b): GET /orders?chip=&owner_id=&value=&q=, /orders/meta, /orders/:id.
// Dữ liệu = prototype L7788 (fixture sinh bởi tools/scripts/fixtures/gen-orders.py). 2 trục: status + pay_status (suy từ khoản thu).
import { ApiRequestError, ROLE_DEFS, quoteTotals, type Discount, type ErrorCode } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/orders.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import type { QuoteItem } from './quotes';
import { paginate } from '../paginate';

type Fixed = (typeof fixture.orders)[number];
export type OrderStatus = 'new' | 'processing' | 'completed' | 'cancelled';
export type PayStatus = 'unpaid' | 'awaiting_deposit' | 'deposited' | 'partial' | 'paid' | 'refunded';
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
  deleted?: boolean;
};

export interface OrdersState {
  orders: Order[];
  seq: number;
}

export const createOrdersState = (): OrdersState => ({
  orders: structuredClone(fixture.orders) as Order[],
  seq: 290411,
});

const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương', u_khoa: 'Khoa' };

/** pay_status tổng hợp (COMMERCE §4): Chờ cọc chỉ khi deposit_required. */
export const payStatus = (o: Order, total: number): PayStatus => {
  const paid = Number(o.paid_total);
  if (o.status === 'cancelled' && o.refund_pending) return 'refunded';
  if (paid >= total && total > 0) return 'paid';
  if (o.deposit_required && paid >= Number(o.deposit_amount) && paid > 0) return 'deposited';
  if (paid > 0) return 'partial';
  return o.deposit_required ? 'awaiting_deposit' : 'unpaid';
};

/** Chip lọc của prototype (Tất cả · Đã thanh toán · Đã cọc · Chờ cọc · Đã huỷ) — mỗi chip lọc đúng trục của nó. */
const CHIP: Record<string, (o: ReturnType<typeof enrichOrder>) => boolean> = {
  paid: (o) => o.status !== 'cancelled' && o.pay_status === 'paid',
  deposit: (o) => o.status !== 'cancelled' && o.pay_status === 'deposited',
  pending: (o) => o.status !== 'cancelled' && o.pay_status === 'awaiting_deposit',
  cancelled: (o) => o.status === 'cancelled',
};

export const enrichOrder = (o: Order) => {
  const t = quoteTotals(o.items, o.header_discount);
  return { ...o, ...t, pay_status: payStatus(o, Number(t.total)) };
};

const visible = (db: MockDb, o: Order) => {
  if (o.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.sales;
  return scope === 'all' || (scope === 'own' && o.owner_user_id === ME);
};

const find = (db: MockDb, id: string) => {
  const o = db.orders.orders.find((x) => x.id === id && !x.deleted);
  if (!o) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return o;
};
const deny = (code: ErrorCode, message: string): never => {
  throw new ApiRequestError(409, { code, message });
};
const need = (o: Order, ...st: OrderStatus[]) => {
  if (!st.includes(o.status)) deny('INVALID_STATE', `${o.code}: ${o.status}`);
};
const log = (o: Order, type: string, extra: Partial<OrderEvent> = {}) =>
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
          (!p.value || p.value === 'all' || (VALUE[String(p.value)]?.(Number(o.total)) ?? true)) &&
          (!p.source || p.source === 'all' || o.source === p.source) &&
          (!s || [o.code, o.contact_name, o.items[0]?.name ?? ''].some((v) => v.toLowerCase().includes(s))),
      );
    return paginate(rows, p);
  },
  '/orders/meta': (db) => {
    const all = db.orders.orders.filter((o) => visible(db, o)).map(enrichOrder);
    const counts: Record<string, number> = { all: all.length };
    for (const [k, f] of Object.entries(CHIP)) counts[k] = all.filter(f).length;
    const revenue = all.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + Number(o.paid_total), 0);
    return {
      counts,
      stats: {
        total: all.length,
        paid: counts.paid ?? 0,
        pending: counts.pending ?? 0,
        revenue: String(revenue),
      },
      crm: fixture.crm,
      insight: fixture.insight,
      files: fixture.files,
      ai_runs: fixture.ai_runs,
    };
  },
};

export const ordersParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/orders\/(ord_[^/]+)$/);
  if (!m) return undefined;
  return (db) => enrichOrder(find(db, m[1]!));
};

type Fields = {
  contact_id: string;
  owner_user_id?: string;
  contract_id?: string;
  items: QuoteItem[];
  header_discount?: Discount | null;
  deposit_amount?: string;
  shipping?: Partial<Order['shipping']>;
  note?: string;
};

export const insertOrder = (db: MockDb, i: Fields, extra: Partial<Order> = {}) => {
  const n = ++db.orders.seq;
  const contact = db.customers.contacts.find((c) => c.id === i.contact_id);
  const owner = i.owner_user_id ?? ME;
  const dep = Number(i.deposit_amount ?? 0);
  const o: Order = {
    id: `ord_${n}`,
    code: `SP${n}`,
    source: 'manual',
    channel: 'zalo_personal',
    external: null,
    locked_lines: false,
    contact_id: i.contact_id,
    contact_name: contact?.full_name ?? i.contact_id,
    phone: contact?.phone ?? '',
    owner_user_id: owner,
    owner_name: NAMES[owner] ?? owner,
    quote_id: null,
    quote_code: '',
    contract_id: i.contract_id ?? null,
    contract_code: '',
    status: 'new',
    deposit_required: dep > 0,
    deposit_amount: String(dep),
    paid_total: '0',
    refund_pending: false,
    items: i.items,
    header_discount: i.header_discount ?? null,
    created_at: MOCK_NOW,
    cancel_reason: '',
    points_earned: 0,
    shipping: {
      carrier: '',
      tracking: '',
      eta: '',
      address: '',
      receiver: '',
      receiver_phone: '',
      ...i.shipping,
    },
    note: i.note ?? '',
    events: [{ type: 'created', at: MOCK_NOW, actor: NAMES[ME]! }],
    ai: { hint: '', wait: false },
    ...extra,
  };
  db.orders.orders.unshift(o);
  return o;
};

const shift = (db: MockDb) => {
  db.orders.orders.shift();
  db.orders.seq--;
};

export const ordersHandlers: Record<string, MockHandler> = {
  'order.create': {
    execute: (db, i: Fields) => {
      const o = insertOrder(db, i);
      return { order_id: o.id, code: o.code };
    },
    undo: shift,
  },
  'order.create_from_quote': {
    execute: (db, i: { quote_id: string }) => {
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id && !x.deleted);
      if (!q) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.quote_id });
      if (q.status !== 'accepted') deny('INVALID_STATE', `${q.code}: ${q.status}`);
      // Một báo giá chỉ sinh một đơn (order.quote_id unique).
      const dup = db.orders.orders.find((o) => o.quote_id === q.id && !o.deleted);
      if (dup) return { order_id: dup.id, code: dup.code };
      const o = insertOrder(
        db,
        {
          contact_id: q.contact_id,
          owner_user_id: q.owner_user_id,
          items: q.items,
          header_discount: q.header_discount,
        },
        { source: 'quote', quote_id: q.id, quote_code: q.code, contact_name: q.contact_name, phone: q.phone },
      );
      q.converted = { kind: 'order', id: o.id };
      return { order_id: o.id, code: o.code };
    },
    undo: shift,
  },
  'order.create_from_contract': {
    execute: (db, i: { contract_id: string }) => {
      const c = db.contracts.contracts.find((x) => x.id === i.contract_id && !x.deleted);
      if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.contract_id });
      if (c.status !== 'signed') deny('INVALID_STATE', `${c.code}: ${c.status}`);
      const o = insertOrder(
        db,
        {
          contact_id: c.contact_id,
          owner_user_id: c.owner_user_id,
          contract_id: c.id,
          items: [{ name: c.title, qty: 1, unit_price: c.value, tax_rate: 0 }],
        },
        { source: 'contract', contract_code: c.code, contact_name: c.contact_name, phone: c.phone },
      );
      return { order_id: o.id, code: o.code };
    },
    undo: shift,
  },
  'order.update': {
    execute: (db, i: { order_id: string; patch: Partial<Fields> }) => {
      const o = find(db, i.order_id);
      need(o, 'new', 'processing');
      const { owner_user_id, note, ...rest } = i.patch;
      // Đơn sàn chỉ sửa người phụ trách / ghi chú (D31); processing chỉ sửa khi chưa thu (§4).
      if (
        Object.keys(rest).length &&
        (o.locked_lines || (o.status === 'processing' && Number(o.paid_total) > 0))
      )
        deny('INVALID_STATE', `${o.code}: locked`);
      Object.assign(o, rest);
      if (owner_user_id)
        Object.assign(o, { owner_user_id, owner_name: NAMES[owner_user_id] ?? owner_user_id });
      if (note !== undefined) o.note = note;
      return { order_id: o.id };
    },
  },
  'order.set_deposit': {
    execute: (db, i: { order_id: string; deposit_amount: string }) => {
      const o = find(db, i.order_id);
      need(o, 'new', 'processing');
      o.deposit_required = Number(i.deposit_amount) > 0;
      o.deposit_amount = i.deposit_amount;
      log(o, 'deposit_set', { amount: i.deposit_amount });
      return { order_id: o.id, pay_status: enrichOrder(o).pay_status };
    },
  },
  'order.confirm': {
    execute: (db, i: { order_id: string }) => {
      const o = find(db, i.order_id);
      need(o, 'new');
      o.status = 'processing';
      log(o, 'confirmed');
      return { order_id: o.id, status: o.status };
    },
    undo: (db, i: { order_id: string }) => {
      const o = db.orders.orders.find((x) => x.id === i.order_id);
      if (!o) return;
      o.status = 'new';
      o.events.pop();
    },
  },
  'order.complete': {
    execute: (db, i: { order_id: string }) => {
      const o = find(db, i.order_id);
      need(o, 'processing');
      o.status = 'completed';
      // 10.000đ = 1 điểm, một lần khi completed (COMMERCE §7); đơn sàn mặc định không tích điểm (§4b).
      const points = o.source === 'marketplace' ? 0 : Math.floor(Number(enrichOrder(o).total) / 10_000);
      o.points_earned = points;
      log(o, 'completed', { points });
      return { order_id: o.id, status: o.status, points };
    },
    undo: (db, i: { order_id: string }) => {
      const o = db.orders.orders.find((x) => x.id === i.order_id);
      if (!o) return;
      o.status = 'processing';
      o.points_earned = 0;
      o.events.pop();
    },
  },
  'order.cancel': {
    execute: (db, i: { order_id: string; reason: string }) => {
      const o = find(db, i.order_id);
      need(o, 'new', 'processing');
      o.status = 'cancelled';
      o.cancel_reason = i.reason;
      // Đã thu tiền → bắt buộc sinh yêu cầu hoàn tiền, Owner duyệt (COMMERCE §4).
      o.refund_pending = Number(o.paid_total) > 0;
      log(o, 'cancelled', { reason: i.reason });
      if (o.refund_pending) log(o, 'refund_requested', { amount: o.paid_total });
      return { order_id: o.id, status: o.status, refund_requested: o.refund_pending };
    },
  },
  'order.update_shipping': {
    execute: (db, i: { order_id: string; shipping: Partial<Order['shipping']> }) => {
      const o = find(db, i.order_id);
      need(o, 'new', 'processing', 'completed');
      Object.assign(o.shipping, i.shipping);
      log(o, 'shipping');
      return { order_id: o.id };
    },
  },
  'order.sync_now': {
    // Mock OrderSyncProvider: chưa có kết nối sàn thật (adapter P2) — không có đơn mới.
    execute: () => ({ imported: 0 }),
  },
};
