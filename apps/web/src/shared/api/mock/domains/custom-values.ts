// Trường tuỳ biến trên mock (D56): bọc create / update của 6 thực thể — kiểm `custom` theo định nghĩa (Cài đặt › Trường dữ liệu),
// bỏ khỏi input trước handler gốc rồi ghi vào bản ghi. Đọc lại qua `custom` của bản ghi; route danh sách lọc `cf.<key>` bằng `matchCustomFilter`.
import {
  ApiRequestError,
  matchCustomFilter,
  mergeCustomValues,
  validateCustomValues,
  type CustomFieldDef,
  type CustomValues,
} from '@appchat/shared';
import type { MockHandler } from '../handlers';
import { paginate } from '../paginate';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import seed from '../../../../../../../fixtures/prototype-parity/custom-values.json';

type Rec = { id: string; custom?: CustomValues };
interface Target {
  entity: string;
  idKey: string;
  list: (db: MockDb) => Rec[];
}

const T = {
  contact: {
    entity: 'contact',
    idKey: 'contact_id',
    list: (db: MockDb) => db.customers.contacts as unknown as Rec[],
  },
  product: {
    entity: 'product',
    idKey: 'product_id',
    list: (db: MockDb) => db.products.products as unknown as Rec[],
  },
  quote: { entity: 'quote', idKey: 'quote_id', list: (db: MockDb) => db.quotes.quotes as unknown as Rec[] },
  order: { entity: 'order', idKey: 'order_id', list: (db: MockDb) => db.orders.orders as unknown as Rec[] },
  ticket: {
    entity: 'ticket',
    idKey: 'ticket_id',
    list: (db: MockDb) => db.tickets.tickets as unknown as Rec[],
  },
  appointment: {
    entity: 'appointment',
    idKey: 'appointment_id',
    list: (db: MockDb) => db.calendar.appointments as unknown as Rec[],
  },
} satisfies Record<string, Target>;

/** action id → thực thể + chế độ. `update` đọc giá trị ở `input.patch.custom`. */
const WRAPPED: Record<string, [Target, 'create' | 'update']> = {
  'contact.create': [T.contact, 'create'],
  'contact.update': [T.contact, 'update'],
  'product.create': [T.product, 'create'],
  'product.update': [T.product, 'update'],
  'quote.create': [T.quote, 'create'],
  'quote.update': [T.quote, 'update'],
  'order.create': [T.order, 'create'],
  'order.update': [T.order, 'update'],
  'ticket.create': [T.ticket, 'create'],
  'appointment.create': [T.appointment, 'create'],
};

/** Giá trị mẫu (fixtures/prototype-parity/custom-values.json) — gắn vào bản ghi lúc tạo store. */
export function seedCustomValues(db: MockDb) {
  for (const [entity, byId] of Object.entries(seed as Record<string, Record<string, CustomValues>>)) {
    const t = T[entity as keyof typeof T];
    for (const r of t.list(db)) if (byId[r.id]) r.custom = structuredClone(byId[r.id]);
  }
}

export const customDefs = (db: MockDb, entity: string) =>
  (db.settingsData.fields[entity] ?? []) as unknown as CustomFieldDef[];

const split = (input: Record<string, unknown>, mode: 'create' | 'update') => {
  if (mode === 'create') {
    const { custom, ...rest } = input;
    return { custom: custom as CustomValues | undefined, rest };
  }
  const patch = (input.patch ?? {}) as Record<string, unknown>;
  const { custom, ...p } = patch;
  return { custom: custom as CustomValues | undefined, rest: { ...input, patch: p } };
};

function wrap(id: string, h: MockHandler, [t, mode]: [Target, 'create' | 'update']): MockHandler {
  return {
    ...h,
    execute: (db, input: Record<string, unknown>) => {
      const { custom, rest } = split(input, mode);
      const errors = validateCustomValues(customDefs(db, t.entity), custom, db.role, mode);
      if (Object.keys(errors).length)
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: id, fields: errors });
      const out = h.execute(db, rest as never) as Record<string, unknown> | undefined;
      const recId = String(out?.[t.idKey] ?? input[t.idKey] ?? '');
      const rec = t.list(db).find((r) => r.id === recId);
      if (rec && (custom || mode === 'create')) rec.custom = mergeCustomValues(rec.custom, custom);
      return out;
    },
  };
}

/** Bọc các handler create / update đã đăng ký; handler khác giữ nguyên. */
export function withCustomValues(handlers: Record<string, MockHandler>): Record<string, MockHandler> {
  return Object.fromEntries(
    Object.entries(handlers).map(([id, h]) => [id, WRAPPED[id] ? wrap(id, h, WRAPPED[id]) : h]),
  );
}

/** route danh sách → thực thể. Lọc `cf.*` trên toàn bộ hàng rồi mới phân trang để `meta.total` đúng. */
const LISTS: Record<string, string> = {
  '/contacts': 'contact',
  '/products': 'product',
  '/quotes': 'quote',
  '/orders': 'order',
  '/tickets': 'ticket',
  '/calendar': 'appointment',
};

function filterList(entity: string, route: MockRoute): MockRoute {
  return (db, p) => {
    const cf = Object.fromEntries(
      Object.entries(p)
        .filter(([k, v]) => k.startsWith('cf.') && v)
        .map(([k, v]) => [k.slice(3), String(v)]),
    );
    if (!Object.keys(cf).length) return route(db, p);
    const { page, limit, ...rest } = p;
    const all = route(db, rest) as { data: Rec[]; next_cursor: string | null };
    const defs = customDefs(db, entity);
    const rows = all.data.filter((r) => matchCustomFilter(defs, r.custom, cf));
    return page === undefined ? { ...all, data: rows } : paginate(rows, { page, limit });
  };
}

/** Bọc các route danh sách đã đăng ký; route khác giữ nguyên. */
export function withCustomFilters(routes: Record<string, MockRoute>): Record<string, MockRoute> {
  return Object.fromEntries(
    Object.entries(routes).map(([path, r]) => [path, LISTS[path] ? filterList(LISTS[path], r) : r]),
  );
}
