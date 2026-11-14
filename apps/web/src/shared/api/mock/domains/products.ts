// Mock Sản phẩm (Blueprint §4.4 catalog): GET /products?type=&category=&status=&q=, /products/:id, /products/meta,
// /products/:id/activity, /categories (TIP-027 — cùng schema packages/shared/src/api/catalog.ts với API thật).
// Dữ liệu = prototype L5624–5753 (fixture sinh bởi tools/scripts/fixtures/gen-products.py). Giá chưa VAT, tiền là string VND.
import { ApiRequestError, canonicalDoc, descriptionDocSchema, descriptionText, type CustomValues, type DescriptionDoc } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/products.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { paginate } from '../paginate';
import { productMediaOf } from './product-media';
import { importCancel, importPreview, importRetry, importRun, type ImportCatalog, type ImportInput } from './product-import';

export type ProductsFixture = typeof fixture;
type Fixed = ProductsFixture['products'][number];
export type Product = Omit<Fixed, 'stock' | 'sessions' | 'valid_days' | 'cost'> & {
  cost: string | null;
  stock: number | null;
  sessions: number | null;
  valid_days: number | null;
  grant_on_deposit?: boolean;
  deleted?: boolean;
  sku?: string;
  duration_min?: number;
  deposit?: string;
  rental_unit?: string;
  components?: { name: string; qty: number }[];
  attr_defs?: { name: string; values: string[] }[];
  low_stock?: boolean;
  version?: number;
  custom?: CustomValues;
  description_doc?: DescriptionDoc | null;
};

type Activity = {
  id: string;
  kind: 'create' | 'update' | 'price' | 'archive' | 'restore' | 'stock';
  text: string;
  by: string;
  at: string;
  when: string;
};

export interface ProductsState {
  products: Product[];
  categories: string[];
  seq: number;
  activity: Record<string, Activity[]>;
}

const AT = '2026-05-12T09:00:00.000Z';
let actSeq = 0;
const entry = (kind: Activity['kind'], text: string, by = 'Trâm', at = AT): Activity => ({
  id: `act_${++actSeq}`,
  kind,
  text,
  by,
  at,
  when: `${at.slice(8, 10)}/${at.slice(5, 7)}/${at.slice(0, 4)} ${at.slice(11, 16)}`,
});
const nowIso = () => new Date().toISOString();

export const createProductsState = (): ProductsState => ({
  products: (structuredClone(fixture.products) as Product[]).map((p) => ({
    ...p,
    version: 1,
    low_stock: p.stock !== null && p.stock <= 0,
  })),
  categories: [...fixture.categories],
  seq: fixture.products.length,
  activity: Object.fromEntries(fixture.products.map((p) => [p.id, [entry('create', 'Tạo sản phẩm')]])),
});

const log = (db: MockDb, id: string, a: Activity) => (db.products.activity[id] ??= []).unshift(a);
const COLORS = fixture.category_color as Record<string, string>;

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
    return paginate(rows, p);
  },
  '/categories': (db) =>
    db.products.categories.map((name, i) => ({
      id: `cat_${i + 1}`,
      name,
      color: COLORS[name] ?? DEFAULT_PAL[1],
      count: live(db).filter((p) => p.category === name).length,
    })),
  '/products/meta': (db) => ({
    categories: db.products.categories,
    category_color: Object.fromEntries(db.products.categories.map((c) => [c, COLORS[c] ?? DEFAULT_PAL[1]])),
    category_pal: Object.fromEntries(db.products.categories.map((c) => [c, PAL[c] ?? DEFAULT_PAL])),
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
  }),
};

export const productsParamRoute = (path: string): MockRoute | undefined => {
  const a = path.match(/^\/products\/(pd_[^/]+)\/activity$/);
  if (a) return (db) => (find(db, a[1]!), db.products.activity[a[1]!] ?? []);
  const m = path.match(/^\/products\/(pd_[^/]+)$/);
  if (!m) return undefined;
  return (db) => {
    const p = find(db, m[1]!);
    const parts = (p.components ?? []).map((c, i) => ({
      id: live(db).find((x) => x.name === c.name)?.id ?? `pc_${i}`,
      name: c.name,
      qty: c.qty,
    }));
    return { ...p, components: parts, attr_defs: p.attr_defs ?? [], variants: [], media: productMediaOf(db, p.id) };
  };
};

const find = (db: MockDb, id: string) => {
  const p = live(db).find((x) => x.id === id);
  if (!p) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return p;
};

/** Mô tả như `normalizeDescription` của server: có tài liệu → chữ = phép chiếu (khác → 422); chỉ chữ cũ gửi lại nguyên → giữ định dạng. */
function descOf(i: { description?: string; description_doc?: unknown }, cur?: Product): Partial<Product> {
  const plain = i.description?.trim();
  if (i.description_doc) {
    const r = descriptionDocSchema.safeParse(i.description_doc);
    if (!r.success) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'description_doc', fields: { description_doc: 'invalid' } });
    const doc = canonicalDoc(r.data);
    const text = descriptionText(doc);
    if (plain !== undefined && plain !== text) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'description', fields: { description: 'mismatch_doc' } });
    return { description: text, description_doc: text ? doc : null };
  }
  if (i.description_doc === null || plain === '') return { description: '', description_doc: null };
  if (plain === undefined || (cur?.description_doc && plain === cur.description.trim())) return {};
  return { description: plain, description_doc: null };
}

type Fields = Partial<Product> & {
  name: string;
  type: string;
  price: string;
  attrs?: { name: string; values: string[] }[];
};
const attrLabels = (a?: { name: string; values: string[] }[]) =>
  (a ?? []).map((x) => `${x.name}: ${x.values.join('/')}`);
const PAL = fixture.category_pal as unknown as Record<string, [string, string, string]>;
const DEFAULT_PAL: [string, string, string] = ['#F3F4F6', '#6B7280', 'ic-box'];

const importCatalog = (db: MockDb): ImportCatalog => ({
  list: db.products.products,
  create: (r) => (productsHandlers['product.create']!.execute(db, { ...r, type: 'physical' } as never) as { product_id: string }).product_id,
});

export const productsHandlers: Record<string, MockHandler> = {
  'product.create': {
    execute: (db, i: Fields) => {
      const n = ++db.products.seq;
      const cat = i.category ?? db.products.categories[0]!;
      const pal = PAL[cat] ?? DEFAULT_PAL;
      for (const [k, c] of (i.type === 'combo' ? (i.components ?? []) : []).entries())
        if (!live(db).some((x) => x.name.toLowerCase() === c.name.trim().toLowerCase()))
          throw new ApiRequestError(422, {
            code: 'VALIDATION_FAILED',
            message: c.name,
            fields: { [`components.${k}.name`]: 'not_found' },
          });
      const p: Product = {
        id: `pd_${n}`,
        code: i.sku || `SP-${1000 + n}`,
        name: i.name,
        category: cat,
        type: i.type,
        price: i.price,
        cost: i.cost ?? null,
        unit: i.unit ?? 'Cái',
        tax_rate: i.tax_rate ?? 8,
        sold: 0,
        status: i.status ?? 'active',
        channels: [],
        description: '',
        ...descOf(i),
        attrs: attrLabels(i.attrs),
        stock: i.stock ?? (i.type === 'physical' ? 0 : null),
        sessions: i.sessions ?? null,
        valid_days: i.valid_days ?? null,
        grant_on_deposit: i.grant_on_deposit ?? false,
        components: i.components,
        attr_defs: i.attrs,
        version: 1,
        low_stock: false,
        tint: pal[0],
        ink: pal[1],
        icon: pal[2],
      };
      if (!db.products.categories.includes(cat)) db.products.categories.push(cat);
      db.products.products.unshift(p);
      db.products.activity[p.id] = [entry('create', 'Tạo sản phẩm', 'Bạn', nowIso())];
      if (p.stock) log(db, p.id, entry('stock', `Tồn ban đầu: ${p.stock}`, 'Bạn', nowIso()));
      return { product_id: p.id, code: p.code };
    },
    undo: (db) => {
      db.products.products.shift();
    },
  },
  'product.update': {
    execute: (db, i: { product_id: string; patch: Partial<Fields>; if_version?: number }) => {
      const p = find(db, i.product_id);
      if (i.if_version !== undefined && i.if_version !== p.version)
        throw new ApiRequestError(409, { code: 'STALE_VERSION', message: p.id });
      const { attrs, description, description_doc, ...rest } = i.patch;
      const price = p.price;
      Object.assign(p, rest, descOf({ description, description_doc }, p), attrs ? { attrs: attrLabels(attrs), attr_defs: attrs } : {});
      p.version = (p.version ?? 1) + 1;
      const priced = rest.price && rest.price !== price;
      log(
        db,
        p.id,
        priced
          ? entry('price', `Đổi giá bán: ${price} → ${rest.price}`, 'Bạn', nowIso())
          : entry('update', 'Cập nhật thông tin sản phẩm', 'Bạn', nowIso()),
      );
      return { product_id: p.id, version: p.version };
    },
  },
  'product.archive': {
    execute: (db, i: { product_id: string }) => {
      find(db, i.product_id).deleted = true;
      log(db, i.product_id, entry('archive', 'Lưu trữ sản phẩm', 'Bạn', nowIso()));
      return { product_id: i.product_id };
    },
    undo: (db, i: { product_id: string }) => {
      const p = db.products.products.find((x) => x.id === i.product_id);
      if (!p) return;
      p.deleted = false;
      log(db, p.id, entry('restore', 'Khôi phục sản phẩm', 'Bạn', nowIso()));
    },
  },
  // Nhập từ tệp (TIP-032b): logic ở product-import.ts; tạo mới đi qua `product.create` như form.
  'product.import': {
    preview: (_db, i: ImportInput) => importPreview(i),
    execute: (db, i: ImportInput) => importRun(importCatalog(db), i),
  },
  'product.import_cancel': { execute: (_db, i: { import_id: string }) => importCancel(i) },
  'product.import_retry': { execute: (_db, i: { import_id: string }) => importRetry(i) },
  'category.create': {
    execute: (db, i: { name: string }) => {
      if (!db.products.categories.includes(i.name)) db.products.categories.push(i.name);
      return { name: i.name };
    },
  },
  'stock.adjust': {
    execute: (db, i: { product_id: string; delta: number; reason: string }) => {
      const p = find(db, i.product_id);
      if (p.type !== 'physical') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: p.id });
      p.stock = (p.stock ?? 0) + i.delta;
      p.low_stock = p.stock <= 0;
      const d = `${i.delta > 0 ? '+' : ''}${i.delta}`;
      log(db, p.id, entry('stock', `Điều chỉnh tồn ${d} · ${i.reason}`, 'Bạn', nowIso()));
      return { product_id: p.id, stock: p.stock, low_stock: p.low_stock };
    },
    undo: (db, i: { product_id: string; delta: number }) => {
      const p = db.products.products.find((x) => x.id === i.product_id);
      if (p) p.stock = (p.stock ?? 0) - i.delta;
    },
  },
};
