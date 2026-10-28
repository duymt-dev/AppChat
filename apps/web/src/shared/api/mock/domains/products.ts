// Mock Sản phẩm (Blueprint §4.4 catalog): GET /products?type=&category=&status=&q=, /products/:id, /products/meta.
// Dữ liệu = prototype L5624–5753 (fixture sinh bởi tools/scripts/fixtures/gen-products.py). Giá chưa VAT, tiền là string VND.
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/products.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type ProductsFixture = typeof fixture;
type Fixed = ProductsFixture['products'][number];
export type Product = Omit<Fixed, 'stock' | 'sessions' | 'valid_days'> & {
  stock: number | null;
  sessions: number | null;
  valid_days: number | null;
  deleted?: boolean;
  sku?: string;
  duration_min?: number;
  deposit?: string;
  rental_unit?: string;
  components?: { name: string; qty: number }[];
  custom?: Record<string, string>;
};

export interface ProductsState {
  products: Product[];
  categories: string[];
  seq: number;
}

export const createProductsState = (): ProductsState => ({
  products: structuredClone(fixture.products) as Product[],
  categories: [...fixture.categories],
  seq: fixture.products.length,
});

const live = (db: MockDb) => db.products.products.filter((p) => !p.deleted);

export const productsRoutes: Record<string, MockRoute> = {
  '/products': (db, p) => {
    const q = String(p.q ?? '')
      .trim()
      .toLowerCase();
    const rows = live(db).filter(
      (x) =>
        (!p.category || p.category === 'all' || x.category === p.category) &&
        (!p.type || x.type === p.type) &&
        (!p.status || x.status === p.status) &&
        (!q || x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q)),
    );
    return { data: rows, next_cursor: null };
  },
  '/products/meta': (db) => ({
    categories: db.products.categories,
    category_color: fixture.category_color,
    category_pal: fixture.category_pal,
    sync_sources: fixture.sync_sources,
    stats: {
      total: live(db).length,
      active: live(db).filter((x) => x.status === 'active').length,
      ...fixture.stats,
    },
    files: fixture.files,
    history: fixture.history,
    crm_stats: fixture.crm_stats,
    crm_buyers: fixture.crm_buyers,
    custom_fields: fixture.custom_fields,
  }),
};

export const productsParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/products\/(pd_[^/]+)$/);
  if (!m) return undefined;
  return (db) => {
    const p = live(db).find((x) => x.id === m[1]);
    if (!p) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: m[1]! });
    return p;
  };
};

const find = (db: MockDb, id: string) => {
  const p = live(db).find((x) => x.id === id);
  if (!p) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return p;
};

type Fields = Partial<Product> & {
  name: string;
  type: string;
  price: string;
  attrs?: { name: string; values: string[] }[];
};
const attrLabels = (a?: { name: string; values: string[] }[]) =>
  (a ?? []).map((x) => `${x.name}: ${x.values.join('/')}`);
const PAL = fixture.category_pal as unknown as Record<string, [string, string, string]>;

export const productsHandlers: Record<string, MockHandler> = {
  'product.create': {
    execute: (db, i: Fields) => {
      const n = ++db.products.seq;
      const cat = i.category ?? db.products.categories[0]!;
      const pal = PAL[cat] ?? ['#EDFAF3', '#1F9C4F', 'ic-box'];
      const p: Product = {
        id: `pd_${n}`,
        code: i.sku || `SP-${1000 + n}`,
        name: i.name,
        category: cat,
        type: i.type,
        price: i.price,
        cost: i.cost ?? '0',
        unit: i.unit ?? 'Cái',
        tax_rate: i.tax_rate ?? 8,
        sold: 0,
        status: i.status ?? 'active',
        channels: [],
        description: i.description ?? '',
        attrs: attrLabels(i.attrs),
        stock: i.stock ?? (i.type === 'physical' ? 0 : null),
        sessions: i.sessions ?? null,
        valid_days: i.valid_days ?? null,
        components: i.components,
        custom: i.custom,
        tint: pal[0],
        ink: pal[1],
        icon: pal[2],
      };
      db.products.products.unshift(p);
      return { product_id: p.id, code: p.code };
    },
    undo: (db) => {
      db.products.products.shift();
    },
  },
  'product.update': {
    execute: (db, i: { product_id: string; patch: Partial<Fields> }) => {
      const p = find(db, i.product_id);
      const { attrs, ...rest } = i.patch;
      Object.assign(p, rest, attrs ? { attrs: attrLabels(attrs) } : {});
      return { product_id: p.id };
    },
  },
  'product.archive': {
    execute: (db, i: { product_id: string }) => {
      find(db, i.product_id).deleted = true;
      return { product_id: i.product_id };
    },
    undo: (db, i: { product_id: string }) => {
      const p = db.products.products.find((x) => x.id === i.product_id);
      if (p) p.deleted = false;
    },
  },
  'category.create': {
    execute: (db, i: { name: string }) => {
      if (!db.products.categories.includes(i.name)) db.products.categories.push(i.name);
      return { name: i.name };
    },
  },
  'stock.adjust': {
    execute: (db, i: { product_id: string; delta: number }) => {
      const p = find(db, i.product_id);
      p.stock = (p.stock ?? 0) + i.delta;
      return { product_id: p.id, stock: p.stock };
    },
  },
};
