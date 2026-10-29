// Dữ liệu dày (D42): `?session=…,bulk` nhân bản mỗi danh sách lên ~BULK dòng để thấy phân trang + cuộn trong bảng (e2e, xem thử).
// Parity / e2e mặc định giữ fixture prototype nguyên vẹn. Bản sao đổi id / mã (hậu tố -bN) để không trùng khoá, giữ liên kết sang khách gốc.
import type { MockDb } from './store';

export const BULK = 120;

const grow = <T extends Record<string, unknown>>(rows: T[], keys: readonly (keyof T)[]): T[] => {
  if (!rows.length) return rows;
  const out = [...rows];
  for (let n = 1; out.length < BULK; n++)
    for (const r of rows) {
      if (out.length >= BULK) break;
      const c = structuredClone(r) as Record<string, unknown>;
      for (const k of keys) if (typeof c[k as string] === 'string') c[k as string] = `${c[k as string]}-b${n}`;
      out.push(c as T);
    }
  return out;
};

export const bulkify = (db: MockDb) => {
  db.customers.contacts = grow(db.customers.contacts, ['id', 'code']);
  db.products.products = grow(db.products.products, ['id', 'code']);
  db.quotes.quotes = grow(db.quotes.quotes, ['id', 'code']);
  db.orders.orders = grow(db.orders.orders, ['id', 'code']);
  db.invoices.invoices = grow(db.invoices.invoices, ['id', 'code']);
  db.contracts.contracts = grow(db.contracts.contracts, ['id', 'code', 'number']);
  db.tickets.tickets = grow(db.tickets.tickets, ['id', 'code']);
  db.marketing.campaigns = grow(db.marketing.campaigns, ['id', 'code']);
  db.loyalty.members = grow(db.loyalty.members, ['contact_id', 'phone']);
};
