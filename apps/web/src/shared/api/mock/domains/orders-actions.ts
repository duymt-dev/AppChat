// Ghi Đơn hàng ở mock — cùng bảng ORDER_FLOW + payStatusOf + pointsFor với server (COMMERCE §4, §4b, §7): sai trạng thái →
// INVALID_TRANSITION 409; processing chỉ sửa khi chưa thu; đơn sàn khoá dòng / cọc (INVALID_STATE); huỷ đã thu → chờ hoàn tiền; điểm
// một lần khi hoàn tất (đơn sàn 0). Mã `DH-{n}` (D52).
import { ApiRequestError, ORDER_FLOW, SHIPPING_EDITABLE, assertTransition, pointsFor, type AppError, type Discount } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import type { QuoteItem } from './quotes';
import { NAMES, deny, enrichOrder, findOrder, logOrder, type Order, type OrderStatus } from './orders';
import { sendOrderConfirmation } from './commerce-delivery';

const step = (o: Order, action: string): OrderStatus => {
  try {
    return assertTransition(ORDER_FLOW, o.status, action);
  } catch (e) {
    return deny('INVALID_TRANSITION', (e as AppError).fields?.status ?? o.status);
  }
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

const overTotal = (field: string) => {
  throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: field, fields: { [field]: 'over_total' } });
};

export const insertOrder = (db: MockDb, i: Fields, extra: Partial<Order> = {}) => {
  const n = ++db.orders.seq;
  const contact = db.customers.contacts.find((c) => c.id === i.contact_id);
  const owner = i.owner_user_id ?? ME;
  const dep = Number(i.deposit_amount ?? 0);
  const o: Order = {
    id: `ord_${n}`,
    code: `DH-${String(n).padStart(6, '0')}`,
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
    shipping: { carrier: '', tracking: '', eta: '', address: '', receiver: '', receiver_phone: '', ...i.shipping },
    note: i.note ?? '',
    events: [{ type: 'created', at: MOCK_NOW, actor: NAMES[ME]! }],
    ai: { hint: '', wait: false },
    ...extra,
  };
  if (dep > Number(enrichOrder(o).total)) overTotal('deposit_amount');
  db.orders.orders.unshift(o);
  return o;
};

const shift = (db: MockDb) => {
  const o = db.orders.orders.shift();
  db.orders.seq--;
  const q = o?.quote_id ? db.quotes.quotes.find((x) => x.id === o.quote_id) : null;
  if (q) q.converted = null;
};

export const ordersHandlers: Record<string, MockHandler> = {
  'order.create': {
    execute: (db, i: Fields) => {
      const o = insertOrder(db, i, i.contract_id ? { source: 'contract' } : {});
      return { order_id: o.id, code: o.code };
    },
    undo: shift,
  },
  'order.create_from_quote': {
    execute: (db, i: { quote_id: string }) => {
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id && !x.deleted);
      if (!q) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.quote_id });
      // Một báo giá → một HĐ HOẶC một đơn (TIP-032b): đã có HĐ → QUOTE_ALREADY_CONVERTED; gọi lại trả đơn cũ.
      const contract = db.contracts.contracts.find((c) => c.quote_id === q.id && !c.deleted);
      if (contract) throw new ApiRequestError(409, { code: 'QUOTE_ALREADY_CONVERTED', message: q.code, fields: { quote_id: 'has_contract', code: contract.code } });
      const dup = db.orders.orders.find((o) => o.quote_id === q.id && !o.deleted);
      if (dup) return { order_id: dup.id, code: dup.code };
      if (q.status !== 'accepted') deny('INVALID_TRANSITION', q.status);
      const o = insertOrder(
        db,
        { contact_id: q.contact_id, owner_user_id: q.owner_user_id, items: q.items, header_discount: q.header_discount },
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
      if (c.status !== 'signed') deny('INVALID_TRANSITION', c.status);
      // Dòng hàng từ báo giá nguồn (nếu có) — như server; không có thì một dòng "tên hợp đồng × giá trị".
      const q = c.quote_id ? db.quotes.quotes.find((x) => x.id === c.quote_id) : null;
      const o = insertOrder(
        db,
        {
          contact_id: c.contact_id,
          owner_user_id: c.owner_user_id,
          contract_id: c.id,
          items: q?.items ?? [{ name: c.title || c.code, qty: 1, unit_price: c.value, tax_rate: 0 }],
          header_discount: q?.header_discount ?? null,
        },
        { source: 'contract', contract_code: c.code, contact_name: c.contact_name, phone: c.phone },
      );
      return { order_id: o.id, code: o.code };
    },
    undo: shift,
  },
  'order.update': {
    execute: (db, i: { order_id: string; patch: Partial<Fields> }) => {
      const o = findOrder(db, i.order_id);
      step(o, 'order.update');
      const { owner_user_id, note, contact_id, ...money } = i.patch;
      if (contact_id && contact_id !== o.contact_id)
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'contact_id', fields: { 'patch.contact_id': 'immutable' } });
      // Đơn sàn chỉ sửa người phụ trách / ghi chú (D31); processing chỉ sửa khi chưa thu (§4).
      if (Object.keys(money).length && o.locked_lines) deny('INVALID_STATE', `${o.code}: locked_lines`);
      if (Object.keys(money).length && o.status === 'processing' && Number(o.paid_total) > 0) deny('INVALID_STATE', `${o.code}: paid`);
      const next = { ...o, ...(money.items ? { items: money.items } : {}), ...(money.header_discount !== undefined ? { header_discount: money.header_discount } : {}) };
      const dep = money.deposit_amount !== undefined ? Number(money.deposit_amount) : Number(o.deposit_amount);
      if (dep > Number(enrichOrder(next).total)) overTotal('patch.deposit_amount');
      if (money.items) o.items = money.items;
      if (money.header_discount !== undefined) o.header_discount = money.header_discount;
      if (money.deposit_amount !== undefined) Object.assign(o, { deposit_required: dep > 0, deposit_amount: String(dep) });
      if (money.shipping) Object.assign(o.shipping, money.shipping);
      if (owner_user_id) Object.assign(o, { owner_user_id, owner_name: NAMES[owner_user_id] ?? owner_user_id });
      if (note !== undefined) o.note = note;
      return { order_id: o.id };
    },
  },
  'order.set_deposit': {
    execute: (db, i: { order_id: string; deposit_amount: string }) => {
      const o = findOrder(db, i.order_id);
      step(o, 'order.set_deposit');
      if (o.locked_lines) deny('INVALID_STATE', `${o.code}: locked_lines`);
      if (Number(i.deposit_amount) > Number(enrichOrder(o).total)) overTotal('deposit_amount');
      o.deposit_required = Number(i.deposit_amount) > 0;
      o.deposit_amount = i.deposit_amount;
      logOrder(o, 'deposit_set', { amount: i.deposit_amount });
      return { order_id: o.id, pay_status: enrichOrder(o).pay_status };
    },
  },
  'order.confirm': {
    execute: (db, i: { order_id: string }) => {
      const o = findOrder(db, i.order_id);
      o.status = step(o, 'order.confirm');
      logOrder(o, 'confirmed');
      return { order_id: o.id, status: o.status, low_stock: [] };
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
      const o = findOrder(db, i.order_id);
      o.status = step(o, 'order.complete');
      // floor(net trước VAT / 10.000) × hệ số hạng, một lần khi completed (COMMERCE §7); đơn sàn không tích điểm (§4b). Khách mock chưa
      // có hạng (loyalty — TIP-036) → hệ số 1.
      const t = enrichOrder(o);
      const net = String(Number(t.subtotal) - Number(t.discount_total));
      const points = o.source === 'marketplace' ? 0 : pointsFor(net, null);
      o.points_earned = points;
      logOrder(o, 'completed', { points });
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
      const o = findOrder(db, i.order_id);
      o.status = step(o, 'order.cancel');
      o.cancel_reason = i.reason;
      // Đã thu tiền → bắt buộc sinh yêu cầu hoàn tiền, Owner duyệt (COMMERCE §4).
      o.refund_pending = Number(o.paid_total) > 0;
      logOrder(o, 'cancelled', { reason: i.reason });
      if (o.refund_pending) logOrder(o, 'refund_requested', { amount: o.paid_total });
      return { order_id: o.id, status: o.status, refund_requested: o.refund_pending };
    },
  },
  'order.update_shipping': {
    execute: (db, i: { order_id: string; shipping: Partial<Order['shipping']> }) => {
      const o = findOrder(db, i.order_id);
      // Mã vận đơn có thể về sau khi hoàn tất (ngoài ORDER_FLOW).
      if (!SHIPPING_EDITABLE.includes(o.status)) deny('INVALID_TRANSITION', o.status);
      Object.assign(o.shipping, i.shipping);
      logOrder(o, 'shipping');
      return { order_id: o.id };
    },
  },
  'order.sync_now': {
    // Mock OrderSyncProvider: chưa có kết nối sàn thật (adapter P2) — không có đơn mới.
    execute: () => ({ imported: 0 }),
  },
  'order.send_confirmation': { execute: (db, i: { order_id: string; channel?: string }) => sendOrderConfirmation(findOrder(db, i.order_id), i.channel) },
};
