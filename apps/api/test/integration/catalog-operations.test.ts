// TIP-032b P4 trên Postgres 16 + Memurai: thao tác danh mục còn thiếu + nhập sản phẩm từ tệp + nền 202 `job_accepted`.
// Nhập ≤ 500 dòng: xem trước (bulk) → xác nhận → chạy ngay sau commit — tạo / cập nhật theo SKU, dòng lỗi có biên nhận lỗi, `/errors` chỉ
// dòng lỗi. > 500 dòng: 202 job_accepted (handle import_id + status_url) — gửi lại cùng Idempotency-Key trả đúng handle, không xếp việc
// lần hai; worker (`ImportDeps.run`) chạy xong; chạy lại không nhập lại dòng đã có biên nhận. Huỷ / chạy lại / xem chỉ của người gọi.
// Danh mục: đổi tên trùng → 409; xoá danh mục còn sản phẩm → 409 kèm số. Biến thể: SKU trùng (kể cả mã sản phẩm) → 409; lưu trữ giữ lịch sử
// và giải phóng SKU; hoàn tác lưu trữ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ImportDeps, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

async function upload(name: string, text: string, token = h.tokenFor(h.user)) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([Buffer.from(text, 'utf8')], { type: 'text/csv' }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...bearer(token) }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

/** Bulk → 202 preview → gửi lại kèm confirm_token (cùng khoá idempotency). */
async function confirmed(id: string, input: unknown, key = uuidv7(), headers: Record<string, string> = {}) {
  const p = await json(await call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...headers }));
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  expect(p.body.data.status).toBe('preview_required');
  return { preview: p.body.data.preview, res: await json(await call(h, `/actions/${id}`, { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': key, ...headers })) };
}

const MAP = { name: 'Tên', price: 'Giá', sku: 'Mã', type: 'Loại' };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('nhập sản phẩm ≤ 500 dòng', () => {
  it('xem trước có số dòng + cảnh báo dòng lỗi; xác nhận → tạo / cập nhật theo SKU / lỗi theo dòng; /errors chỉ dòng lỗi', async () => {
    const existing = ok(await act('product.create', { name: 'Serum cũ', type: 'physical', price: '100000', sku: 'IMP-OLD' })).result.product_id as string;
    const file = await upload('sp.csv', 'Tên,Giá,Mã,Loại\nSerum mới,"350.000đ",IMP-1,\nSerum cũ đổi tên,120000,imp-old,\n,50000,IMP-2,\nKem,abc,IMP-3,\n');
    const { preview, res } = await confirmed('product.import', { file_id: file, mapping: MAP });
    expect(preview.summary).toContain('sp.csv');
    expect(JSON.stringify(preview)).toContain('name:required');
    const r = ok(res).result;
    expect(r).toMatchObject({ status: 'queued', total: 4 });
    const st = await json(await call(h, `/product-imports/${r.import_id}`));
    expect(st.body.data).toMatchObject({ status: 'completed', total: 4, processed: 4, created: 1, updated: 1, failed: 2 });
    const db = await tenant();
    expect(await db.product.findUniqueOrThrow({ where: { id: existing } })).toMatchObject({ name: 'Serum cũ đổi tên' });
    expect((await db.product.findFirstOrThrow({ where: { code: 'IMP-1' } })).price.toString()).toBe('350000');
    const errs = await json(await call(h, `/product-imports/${r.import_id}/errors`));
    expect(errs.body.data.map((x: { row_no: number; error: string }) => [x.row_no, x.error])).toEqual([[3, 'name:required'], [4, 'price:invalid']]);
    expect((await json(await call(h, `/product-imports/${r.import_id}/rows?limit=2&page=2`))).body.data.map((x: { row_no: number }) => x.row_no)).toEqual([3, 4]);
  });

  it('cột ánh xạ không có / tệp không phải bảng → 422 theo trường; Sales (không catalog.manage) → 403', async () => {
    const file = await upload('thieu.csv', 'Tên,Giá\nA,1\n');
    const bad = await act('product.import', { file_id: file, mapping: { name: 'Tên', price: 'Đơn giá' } });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields).toMatchObject({ 'mapping.price': 'column_not_found' });
    const sales = await h.member('sales');
    expect((await act('product.import', { file_id: file, mapping: { name: 'Tên', price: 'Giá' } }, bearer(sales.token))).status).toBe(403);
  });
});

describe('nhập sản phẩm > 500 dòng — 202 job_accepted', () => {
  const big = ['Tên,Giá,Mã', ...Array.from({ length: 501 }, (_, i) => `Hàng loạt ${i + 1},10000,BIG-${i + 1}`)].join('\n');
  let importId = '';

  it('xác nhận → 202 job_accepted có handle; cùng Idempotency-Key gửi lại → đúng handle, không thêm lần nhập; worker chạy xong', async () => {
    const file = await upload('lon.csv', big);
    const key = uuidv7();
    const { res } = await confirmed('product.import', { file_id: file, mapping: { name: 'Tên', price: 'Giá', sku: 'Mã' } }, key);
    expect(res.status, JSON.stringify(res.body)).toBe(202);
    const a = res.body.data as { status: string; job_id: string; action_log_id: string; status_url: string };
    expect(a).toMatchObject({ status: 'job_accepted', status_url: `/v1/product-imports/${a.job_id}` });
    importId = a.job_id;
    const again = await json(await call(h, '/actions/product.import', { input: { file_id: file, mapping: { name: 'Tên', price: 'Giá', sku: 'Mã' } } }, { 'idempotency-key': key }));
    expect(again.status).toBe(202);
    expect(again.body.data).toEqual(a);
    const db = await tenant();
    expect(await db.productImport.count({ where: { fileId: file } })).toBe(1);
    expect((await json(await call(h, `/product-imports/${importId}`))).body.data).toMatchObject({ status: 'queued', total: 501, processed: 0 });
    expect(await h.app.get(ImportDeps, { strict: false }).run(h.ws, importId)).toBe('completed');
    expect((await json(await call(h, `/product-imports/${importId}`))).body.data).toMatchObject({ status: 'completed', processed: 501, created: 501, failed: 0 });
  });

  it('huỷ lần đã xong → 409; chạy lại sau huỷ không nhập lại dòng đã có biên nhận', async () => {
    expect((await act('product.import_cancel', { import_id: importId })).status).toBe(409);
    const db = await tenant();
    await db.productImport.update({ where: { id: importId }, data: { status: 'cancelled' } });
    const retry = await act('product.import_retry', { import_id: importId });
    expect(retry.status).toBe(202);
    expect(retry.body.data).toMatchObject({ status: 'job_accepted', job_id: importId });
    expect(await h.app.get(ImportDeps, { strict: false }).run(h.ws, importId)).toBe('completed');
    expect(await db.product.count({ where: { code: { startsWith: 'BIG-' } } })).toBe(501);
    expect(await db.productImportRow.count({ where: { importId } })).toBe(501);
  });

  it('người khác (Quản lý) không thấy / không huỷ lần nhập của Owner → 404', async () => {
    const m = await h.member('manager');
    expect((await call(h, `/product-imports/${importId}`, undefined, bearer(m.token))).status).toBe(404);
    expect((await act('product.import_retry', { import_id: importId }, bearer(m.token))).status).toBe(404);
  });
});

describe('danh mục + biến thể', () => {
  it('category.update đổi tên trùng → 409; category.delete còn sản phẩm → 409 kèm số; danh mục trống xoá được', async () => {
    ok(await act('category.create', { name: 'Danh mục A' }));
    ok(await act('category.create', { name: 'Danh mục B' }));
    ok(await act('product.create', { name: 'SP thuộc A', type: 'physical', price: '1000', category: 'Danh mục A' }));
    const db = await tenant();
    const [a, b] = await Promise.all(['Danh mục A', 'Danh mục B'].map((name) => db.productCategory.findFirstOrThrow({ where: { name } })));
    const dup = await act('category.update', { category_id: b!.id, name: 'danh mục a' });
    expect(dup.status).toBe(409);
    const del = await act('category.delete', { category_id: a!.id });
    expect(del.status).toBe(409);
    expect(del.body.error.fields).toMatchObject({ category_id: 'has_products' });
    ok(await act('category.update', { category_id: b!.id, name: 'Danh mục B2', color: '#14B8A6' }));
    ok(await act('category.delete', { category_id: b!.id }));
    expect(await db.productCategory.count({ where: { id: b!.id } })).toBe(0);
  });

  it('biến thể: SKU trùng (biến thể / mã sản phẩm) → 409; lưu trữ giải phóng SKU, đọc chỉ thấy biến thể đang bán; hoàn tác lưu trữ', async () => {
    const p = ok(await act('product.create', { name: 'Áo thun', type: 'physical', price: '200000', sku: 'AO-1' })).result.product_id as string;
    const v = ok(await act('product_variant.create', { product_id: p, name: 'Size L', sku: 'AO-L', price: '220000' })).result.variant_id as string;
    expect((await act('product_variant.create', { product_id: p, name: 'Size L2', sku: 'ao-l' })).status).toBe(409);
    expect((await act('product_variant.create', { product_id: p, name: 'Trùng mã SP', sku: 'AO-1' })).status).toBe(409);
    const up = ok(await act('product_variant.update', { variant_id: v, patch: { price: '230000' }, if_version: 1 })).result;
    expect(up.version).toBe(2);
    expect((await act('product_variant.update', { variant_id: v, patch: { price: '1' }, if_version: 1 })).status).toBe(409);
    const arch = ok(await act('product_variant.archive', { variant_id: v }));
    const read = await json(await call(h, `/products/${p}`));
    expect(read.body.data.variants).toEqual([]);
    const v2 = ok(await act('product_variant.create', { product_id: p, name: 'Size L mới', sku: 'AO-L' })).result.variant_id as string;
    expect(v2).not.toBe(v);
    expect((await tenant().then((db) => db.productVariant.findUniqueOrThrow({ where: { id: v } }))).status).toBe('archived');
    // Hoàn tác lưu trữ khi SKU đã có biến thể khác dùng → 409 (không sinh hai biến thể đang bán cùng SKU).
    expect((await call(h, `/action-logs/${arch.action_log_id}/undo`, {})).status).toBe(409);
  });
});
