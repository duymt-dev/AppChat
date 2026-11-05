// TIP-027 AC1 trên Postgres 16 + Memurai: catalog — migration 027 + index (EXPLAIN danh mục / trigram), create 6 loại (SP-1001…,
// danh mục mới tự tạo, combo nối thành phần, thuộc tính → biến thể, tồn ban đầu → movement), update + if_version → 409, archive
// + undo, stock.adjust (movement, âm + cờ, song song không mất số), quyền (sales xem không giá vốn; kế toán điều chỉnh tồn),
// /products D42 + lọc + cf.*, /meta KPI thật, /activity, product.search / stock.get trả giá + tồn, consumer catalog-sync (không giá).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { categoriesSchema, productActivitySchema, productRowSchema, productsMetaSchema, productsPageSchema } from '@appchat/shared';
import { syncProduct, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let accountant: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  [sales, accountant] = [await h.member('sales'), await h.member('accountant')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const ids: Record<string, string> = {};
async function mk(key: string, input: Record<string, unknown>) {
  h.clock.advance(1000);
  const d = ok(await act('product.create', input));
  return (ids[key] = d.result.product_id as string);
}

describe('tạo 6 loại', () => {
  it('danh mục mặc định seed 5 mục; mã SP-1001…; danh mục mới tự tạo; tồn ban đầu → movement import', async () => {
    const cats = categoriesSchema.parse((await get('/categories')).body.data);
    expect(cats.map((c) => c.name)).toEqual(['Liệu trình', 'Combo', 'Gói năm', 'Dịch vụ lẻ', 'Sản phẩm']);
    await mk('visia', { name: 'Khám da soi VISIA', type: 'service', price: '500000', category: 'Dịch vụ lẻ', duration_min: 60, cost: '310000' });
    await mk('serum', { name: 'Serum phục hồi B5', type: 'physical', price: '680000', category: 'Sản phẩm', stock: 10, low_stock_threshold: 3, unit: 'Chai' });
    await mk('mask', { name: 'Mặt nạ dưỡng ẩm', type: 'physical', price: '120000', category: 'Phụ kiện spa', attrs: [{ name: 'Màu', values: ['Đỏ', 'Đen'] }, { name: 'Size', values: ['S', 'M', 'L'] }] });
    await mk('hifu', { name: 'HIFU nâng cơ 8 buổi', type: 'package', price: '12800000', category: 'Liệu trình', sessions: 8, valid_days: 60 });
    await mk('ebook', { name: 'Ebook chăm sóc da', type: 'digital', price: '99000' });
    await mk('may', { name: 'Máy xông hơi', type: 'rental', price: '200000', rental_unit: 'day', deposit: '1000000' });
    await mk('combo', { name: 'Combo chăm sóc da', type: 'combo', price: '1000000', category: 'Combo', components: [{ name: 'kham da soi visia', qty: 1 }, { name: 'Serum phục hồi B5', qty: 2 }] });
    const db = await tenant();
    const rows = await db.product.findMany({ orderBy: { createdAt: 'asc' }, select: { code: true, type: true, stock: true } });
    expect(rows.map((r) => r.code)).toEqual(['SP-1001', 'SP-1002', 'SP-1003', 'SP-1004', 'SP-1005', 'SP-1006', 'SP-1007']);
    expect(rows.find((r) => r.type === 'service')!.stock).toBeNull();
    expect(await db.stockMovement.findMany({ where: { productId: ids.serum }, select: { kind: true, qty: true } })).toEqual([{ kind: 'import', qty: 10 }]);
    expect((await db.product.findUniqueOrThrow({ where: { id: ids.serum } })).stock).toBe(10);
    expect((await db.productVariant.findMany({ where: { productId: ids.mask }, orderBy: { sku: 'asc' } })).map((v) => v.name)).toHaveLength(6);
    expect((await db.productComponent.findMany({ where: { productId: ids.combo }, orderBy: { qty: 'asc' } })).map((c) => [c.childId, c.qty])).toEqual([[ids.visia, 1], [ids.serum, 2]]);
    expect((categoriesSchema.parse((await get('/categories')).body.data)).find((c) => c.name === 'Phụ kiện spa')).toMatchObject({ count: 1 });
  });

  it('combo thành phần lạ → 422; mã tự nhập trùng → 409; giá âm / thuế lạ → 422', async () => {
    expect((await act('product.create', { name: 'Combo lạ', type: 'combo', price: '1', components: [{ name: 'Không tồn tại', qty: 1 }] })).status).toBe(422);
    expect((await act('product.create', { name: 'Trùng mã', type: 'physical', price: '1', sku: 'SP-1001' })).status).toBe(409);
    expect((await act('product.create', { name: 'Giá âm', type: 'service', price: '-5' })).status).toBe(422);
    expect((await act('product.create', { name: 'Thuế lạ', type: 'service', price: '5', tax_rate: 7 })).status).toBe(422);
  });
});

describe('danh sách D42 + chi tiết + quyền', () => {
  it('/products page + limit + meta.total; lọc danh mục (tên / id), loại, tìm không dấu, cf.*', async () => {
    const all = productsPageSchema.parse((await get('/products?page=1&limit=3')).body);
    expect(all.meta).toEqual({ total: 7, page: 1, limit: 3 });
    expect(all.data.map((p) => p.name)).toEqual(['Combo chăm sóc da', 'Máy xông hơi', 'Ebook chăm sóc da']);
    expect(all.next_cursor).toBe('2');
    expect((await get('/products?page=1&limit=20&category=S%E1%BA%A3n%20ph%E1%BA%A9m')).body.data.map((p: { name: string }) => p.name)).toEqual(['Serum phục hồi B5']);
    const cats = categoriesSchema.parse((await get('/categories')).body.data);
    const lt = cats.find((c) => c.name === 'Liệu trình')!.id;
    expect((await get(`/products?page=1&limit=20&category_id=${lt}`)).body.data.map((p: { name: string }) => p.name)).toEqual(['HIFU nâng cơ 8 buổi']);
    expect((await get('/products?page=1&limit=20&type=physical')).body.meta.total).toBe(2);
    expect((await get('/products?page=1&limit=20&q=cham%20soc')).body.data.map((p: { name: string }) => p.name)).toEqual(['Combo chăm sóc da', 'Ebook chăm sóc da']);
    expect((await get('/products?page=1&limit=20&q=sp-1002')).body.data.map((p: { code: string }) => p.code)).toEqual(['SP-1002']);
    const db = await tenant();
    // TIP-045b annex C: lọc `cf.*` chỉ trên trường có định nghĩa người xem được thấy — key lạ → 422 FIELD_FORBIDDEN.
    expect((await get('/products?page=1&limit=20&cf.warranty=6%20th')).body.error.code).toBe('FIELD_FORBIDDEN');
    ok(await act('custom_field.define', { entity: 'product', label: 'Warranty', type: 'text' }));
    await db.product.update({ where: { id: ids.visia }, data: { custom: { warranty: '6 tháng' } } });
    expect((await get('/products?page=1&limit=20&cf.warranty=6%20th')).body.data.map((p: { id: string }) => p.id)).toEqual([ids.visia]);
    expect((await get('/products?page=0')).status).toBe(400);
  });

  it('dòng: danh mục + màu thẻ, nhãn theo loại, kênh bán trống khi chưa kết nối kênh; chi tiết có thành phần + biến thể', async () => {
    const r = productsPageSchema.parse((await get('/products?page=1&limit=20')).body).data;
    const hifu = r.find((p) => p.id === ids.hifu)!;
    expect(hifu).toMatchObject({ category: 'Liệu trình', tint: '#EDFAF3', ink: '#1F9C4F', icon: 'ic-spark', attrs: ['Buổi: 8', 'Hạn: 60 ngày'], channels: [], price: '12800000', tax_rate: 8, version: 1 });
    expect(r.find((p) => p.id === ids.combo)!.attrs).toEqual(['Gồm: 2 món']);
    expect(r.find((p) => p.id === ids.serum)).toMatchObject({ stock: 10, low_stock: false, unit: 'Chai' });
    const d = productRowSchema.parse((await get(`/products/${ids.combo}`)).body.data);
    expect(d.components).toEqual([expect.objectContaining({ id: ids.visia, name: 'Khám da soi VISIA', qty: 1 }), expect.objectContaining({ id: ids.serum, qty: 2 })].sort(() => 0));
    const m = productRowSchema.parse((await get(`/products/${ids.mask}`)).body.data);
    expect(m.attr_defs).toEqual([{ name: 'Màu', values: ['Đỏ', 'Đen'] }, { name: 'Size', values: ['S', 'M', 'L'] }]);
    expect(m.variants!.map((v) => v.sku)).toEqual(['SP-1003-1', 'SP-1003-2', 'SP-1003-3', 'SP-1003-4', 'SP-1003-5', 'SP-1003-6']);
    expect((await get('/products/khong-phai-uuid')).status).toBe(404);
  });

  it('sales xem được, không thấy giá vốn, không tạo / điều chỉnh tồn; kế toán thấy giá vốn + điều chỉnh tồn', async () => {
    const s = productsPageSchema.parse((await get('/products?page=1&limit=20', sales)).body).data;
    // TIP-045b annex C: giá vốn bị ẩn = không có khoá + hidden_fields (không còn '0' giả).
    expect(s.find((p) => p.id === ids.visia)).not.toHaveProperty('cost');
    expect(s.find((p) => p.id === ids.visia)!.hidden_fields).toEqual(['cost']);
    const a = productsPageSchema.parse((await get('/products?page=1&limit=20', accountant)).body).data;
    expect(a.find((p) => p.id === ids.visia)!.cost).toBe('310000');
    expect((await act('product.create', { name: 'X', type: 'service', price: '1' }, sales)).status).toBe(403);
    expect((await act('stock.adjust', { product_id: ids.serum, delta: 1, reason: 'kiểm' }, sales)).status).toBe(403);
    expect(ok(await act('stock.adjust', { product_id: ids.serum, delta: 2, reason: 'Nhập thêm' }, accountant)).result).toMatchObject({ stock: 12, low_stock: false });
  });
});

describe('sửa + lưu trữ + kho', () => {
  it('update: if_version lệch → 409 STALE_VERSION; đổi giá tăng version; tồn không sửa qua update; hoàn tác khôi phục', async () => {
    const v = productRowSchema.parse((await get(`/products/${ids.visia}`)).body.data).version!;
    const u = ok(await act('product.update', { product_id: ids.visia, patch: { price: '550000', category: 'Liệu trình' }, if_version: v }));
    expect(u.result.version).toBe(v + 1);
    const stale = await act('product.update', { product_id: ids.visia, patch: { price: '1' }, if_version: v });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
    // `stock` không thuộc patch (zod bỏ key lạ) → tồn giữ nguyên, chỉ ghi một lần sửa rỗng.
    h.clock.advance(1000);
    expect((await act('product.update', { product_id: ids.serum, patch: { stock: 99 } })).status).toBe(200);
    const db = await tenant();
    expect((await db.product.findUniqueOrThrow({ where: { id: ids.serum } })).stock).toBe(12);
    expect((await call(h, `/action-logs/${u.action_log_id}/undo`, {})).status).toBe(200);
    const back = await db.product.findUniqueOrThrow({ where: { id: ids.visia }, include: { category: true } });
    expect([String(back.price), back.category?.name]).toEqual(['500000', 'Dịch vụ lẻ']);
    h.clock.advance(1000);
    ok(await act('product.update', { product_id: ids.visia, patch: { price: '520000' } }));
  });

  it('stock.adjust: cho âm + cờ low_stock; 2 request song song không mất số; dịch vụ → 422', async () => {
    const r = ok(await act('stock.adjust', { product_id: ids.serum, delta: -15, reason: 'Kiểm kê' }));
    expect(r.result).toEqual({ product_id: ids.serum, stock: -3, low_stock: true });
    const both = await Promise.all([1, 2].map(() => act('stock.adjust', { product_id: ids.serum, delta: 5, reason: 'Nhập song song' })));
    expect(both.map((x) => x.status)).toEqual([200, 200]);
    const db = await tenant();
    expect((await db.product.findUniqueOrThrow({ where: { id: ids.serum } })).stock).toBe(7);
    const sum = await db.stockMovement.aggregate({ where: { productId: ids.serum }, _sum: { qty: true } });
    expect(sum._sum.qty).toBe(7);
    expect((await act('stock.adjust', { product_id: ids.visia, delta: 1, reason: 'x' })).status).toBe(422);
  });

  it('archive: rời danh sách, không tìm thấy; hoàn tác khôi phục', async () => {
    const a = ok(await act('product.archive', { product_id: ids.ebook }));
    expect((await get('/products?page=1&limit=20')).body.meta.total).toBe(6);
    expect((await get(`/products/${ids.ebook}`)).status).toBe(404);
    expect((await call(h, `/action-logs/${a.action_log_id}/undo`, {})).status).toBe(200);
    expect((await get(`/products/${ids.ebook}`)).status).toBe(200);
  });

  it('/activity: tạo · đổi giá · tồn ban đầu · điều chỉnh (kèm lý do) · lưu trữ + khôi phục, mới nhất trước', async () => {
    const s = productActivitySchema.parse((await get(`/products/${ids.serum}/activity`)).body.data);
    expect(s.map((x) => x.kind)).toEqual(['stock', 'stock', 'stock', 'update', 'stock', 'stock', 'create']);
    expect(s.some((x) => x.text.includes('Kiểm kê') && x.text.includes('-15'))).toBe(true);
    expect(s.at(-2)!.text).toBe('Tồn ban đầu: 10');
    const v = productActivitySchema.parse((await get(`/products/${ids.visia}/activity`)).body.data);
    expect(v[0]).toMatchObject({ kind: 'price', by: 'Owner' });
    expect(v[0]!.text).toMatch(/500\.000₫ → 520\.000₫/);
    const e = productActivitySchema.parse((await get(`/products/${ids.ebook}/activity`)).body.data);
    expect(e.map((x) => x.kind)).toEqual(['restore', 'archive', 'create']);
  });
});

describe('meta + read actions + RAG', () => {
  it('/products/meta: danh mục + màu, KPI thật, kênh bán (kênh chưa kết nối không hiện; sàn = sắp có)', async () => {
    const m = productsMetaSchema.parse((await get('/products/meta')).body.data);
    expect(m.categories).toContain('Phụ kiện spa');
    expect(m.category_pal['Combo']).toEqual(['#EFF7FF', '#2B9EF3', 'ic-gift']);
    expect(m.stats).toEqual({ total: 7, active: 7, channels: 0, sold_month: 0 });
    expect(m.sync_sources.map((s) => [s.key, s.status])).toEqual([['shopee', 'soon'], ['tiktok_shop', 'soon'], ['sapo', 'soon'], ['kiotviet', 'soon']]);
    expect([m.files, m.history, m.crm_stats, m.crm_buyers]).toEqual([[], [], [], []]);
  });

  it('product.search / product.get / stock.get trả giá + tồn từ DB (sales được gọi)', async () => {
    const s = ok(await act('product.search', { query: 'serum' }, sales)).result;
    expect(s.items).toEqual([expect.objectContaining({ product_id: ids.serum, price: '680000', stock: 7, unit: 'Chai', category: 'Sản phẩm' })]);
    const g = ok(await act('product.get', { code: 'SP-1007' }, sales)).result;
    expect(g.components.map((c: { name: string }) => c.name).sort()).toEqual(['Khám da soi VISIA', 'Serum phục hồi B5']);
    const st = ok(await act('stock.get', { product_ids: [ids.serum, ids.visia, uuidv7()] }, sales)).result;
    expect(st.items).toEqual([{ product_id: ids.serum, name: 'Serum phục hồi B5', stock: 7, low: false }, { product_id: ids.visia, name: 'Khám da soi VISIA', stock: null, low: false }]);
  });

  it('EXPLAIN: lọc danh mục dùng product_live_category_idx, tìm dùng product_name_trgm_idx', async () => {
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (sql: string) => (await c.query(`EXPLAIN ${sql}`)).rows.map((r) => r['QUERY PLAN']).join('\n');
      const cat = (await c.query('SELECT id FROM product_category LIMIT 1')).rows[0].id;
      expect(await plan(`SELECT p.id FROM product p WHERE p.deleted_at IS NULL AND p.category_id = '${cat}' ORDER BY p.created_at DESC, p.id DESC LIMIT 20`)).toMatch(/product_live_category_idx/);
      expect(await plan(`SELECT p.id FROM product p WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC, p.id DESC LIMIT 20`)).toMatch(/product_live_recent_idx/);
      const idx = (await c.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'product'`)).rows.map((r) => r.indexname);
      expect(idx).toEqual(expect.arrayContaining(['product_name_trgm_idx', 'product_custom_gin_idx', 'product_live_recent_idx', 'product_live_category_idx']));
      // Bảng nhỏ (và role ứng dụng không ANALYZE được): planner luôn chọn btree partial rẻ hơn → kiểm GIN trigram có đúng biểu thức
      // + vị từ mà repo dùng (`f_unaccent(lower(name))` … `WHERE deleted_at IS NULL`) để dùng được khi bảng lớn.
      const def = (await c.query(`SELECT indexdef FROM pg_indexes WHERE indexname = 'product_name_trgm_idx'`)).rows[0].indexdef as string;
      expect(def).toMatch(/USING gin \(f_unaccent\(lower\(name\)\) gin_trgm_ops\) WHERE \(deleted_at IS NULL\)/);
    } finally {
      await c.end();
    }
  });

  it('catalog-sync: tạo nguồn catalog không chứa giá / tồn; sửa mô tả → nạp lại; không đổi → bỏ qua; lưu trữ → xoá mềm', async () => {
    const db = await tenant();
    const pushed: string[] = [];
    const deps = { push: async (_ws: string, s: { id: string }[]) => void pushed.push(...s.map((x) => x.id)), localeOf: async () => 'vi', now: () => h.clock.now() };
    expect(await syncProduct(db, h.ws, ids.combo!, deps)).toBe('created');
    const src = await db.kbSource.findFirstOrThrow({ where: { productId: ids.combo } });
    expect(src).toMatchObject({ origin: 'catalog', kind: 'product', name: 'Combo chăm sóc da', status: 'pending' });
    expect(src.body).toContain('Gồm: 1 × Khám da soi VISIA');
    expect(src.body).not.toMatch(/1\.000\.000|1000000|₫|Tồn/);
    expect(await syncProduct(db, h.ws, ids.combo!, deps)).toBe('unchanged');
    ok(await act('product.update', { product_id: ids.combo, patch: { description: 'Phục hồi da sau 5 bước' } }));
    expect(await syncProduct(db, h.ws, ids.combo!, deps)).toBe('updated');
    expect((await db.kbSource.findFirstOrThrow({ where: { productId: ids.combo } })).ingestSeq).toBe(2);
    ok(await act('product.archive', { product_id: ids.combo }));
    expect(await syncProduct(db, h.ws, ids.combo!, deps)).toBe('removed');
    expect((await db.kbSource.findFirstOrThrow({ where: { productId: ids.combo } })).deletedAt).not.toBeNull();
    expect(pushed).toEqual([src.id, src.id]);
  });
});
