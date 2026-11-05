// TIP-032b P4 — bổ sung review độc lập (Postgres 16 + Memurai): biên 500 / 501 dòng (sync / job), XLSX hỏng → 422 `unreadable`, dòng SKU
// lặp trong tệp → lỗi dòng sau, quyền bị thu hồi trước khi worker chạy → lần nhập `failed` (forbidden) không ghi dòng nào; biến thể có dòng
// đơn lịch sử: `product.update` bỏ thuộc tính → biến thể lưu trữ (giữ dòng, đơn cũ còn trỏ), chưa dùng → xoá; nhập SKU của sản phẩm đã lưu
// trữ không hồi sinh (lỗi `sku:archived`); ô Loại trống khi cập nhật theo SKU giữ loại hiện có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ImportDeps, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

async function upload(name: string, body: Buffer | string, mime = 'text/csv', token = h.tokenFor(h.user)) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...bearer(token) }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

/** Bulk: preview → xác nhận (cùng khoá). */
async function confirmed(input: unknown, headers: Record<string, string> = {}) {
  const key = uuidv7();
  const p = await json(await call(h, '/actions/product.import', { input }, { 'idempotency-key': key, ...headers }));
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  return json(await call(h, '/actions/product.import', { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': key, ...headers }));
}

const rows = (n: number, prefix: string) => ['Tên,Giá,Mã', ...Array.from({ length: n }, (_, i) => `${prefix} ${i + 1},10000,${prefix}-${i + 1}`)].join('\n');
const MAP = { name: 'Tên', price: 'Giá', sku: 'Mã' };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('nhập sản phẩm — biên và lỗi tệp', () => {
  it('đúng 500 dòng → chạy ngay (200, xong); 501 dòng → 202 job_accepted', async () => {
    const sync = ok(await confirmed({ file_id: await upload('500.csv', rows(500, 'SYN')), mapping: MAP })).result;
    expect((await json(await call(h, `/product-imports/${sync.import_id}`))).body.data).toMatchObject({ status: 'completed', created: 500 });
    const job = await confirmed({ file_id: await upload('501.csv', rows(501, 'JOB')), mapping: MAP });
    expect(job.status).toBe(202);
    expect(job.body.data.status).toBe('job_accepted');
  });

  it('XLSX hỏng → 415 ở cổng tải tệp (TIP-045b); SKU lặp trong tệp → dòng sau lỗi, dòng đầu tạo', async () => {
    const form = new FormData();
    form.set('purpose', 'import');
    form.set('file', new Blob([new Uint8Array(Buffer.from('PK\u0003\u0004 không phải zip'))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'hong.xlsx');
    const bad = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...bearer(h.tokenFor(h.user)) }, body: form });
    expect(bad.status).toBe(415);
    const r = ok(await confirmed({ file_id: await upload('lap.csv', 'Tên,Giá,Mã\nA,1000,DUP-1\nB,2000,dup-1\n'), mapping: MAP })).result;
    const errs = (await json(await call(h, `/product-imports/${r.import_id}/errors`))).body.data;
    expect(errs).toEqual([expect.objectContaining({ row_no: 2, error: 'sku:duplicate_in_file' })]);
    expect(await (await tenant()).product.count({ where: { code: 'DUP-1' } })).toBe(1);
  });

  it('quyền bị thu hồi trước khi worker chạy → lần nhập failed (forbidden), không ghi dòng nào', async () => {
    const m = await h.member('manager');
    const res = await confirmed({ file_id: await upload('thu-hoi.csv', rows(501, 'REV'), 'text/csv', m.token), mapping: MAP }, bearer(m.token));
    expect(res.status).toBe(202);
    const id = res.body.data.job_id as string;
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { roleKey: 'sales' } });
    expect(await h.app.get(ImportDeps, { strict: false }).run(h.ws, id)).toBe('failed');
    const db = await tenant();
    expect(await db.productImport.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'failed', error: 'forbidden' });
    expect(await db.productImportRow.count({ where: { importId: id } })).toBe(0);
    expect(await db.product.count({ where: { code: { startsWith: 'REV-' } } })).toBe(0);
  });

  it('cập nhật theo SKU khi ô Loại trống → giữ loại hiện có (liệu trình); ghi loại khác → type:immutable', async () => {
    const p = ok(await act('product.create', { name: 'Liệu trình 10 buổi', type: 'package', price: '5000000', sessions: 10, sku: 'LT-10' })).result.product_id as string;
    const mapping = { ...MAP, type: 'Loại' };
    const keep = ok(await confirmed({ file_id: await upload('giu-loai.csv', 'Tên,Giá,Mã,Loại\nLiệu trình 10 buổi mới,5500000,LT-10,\n'), mapping })).result;
    expect((await json(await call(h, `/product-imports/${keep.import_id}`))).body.data).toMatchObject({ updated: 1, failed: 0 });
    expect(await (await tenant()).product.findUniqueOrThrow({ where: { id: p } })).toMatchObject({ name: 'Liệu trình 10 buổi mới', type: 'package', sessions: 10 });
    const change = ok(await confirmed({ file_id: await upload('doi-loai.csv', 'Tên,Giá,Mã,Loại\nĐổi loại,1000,lt-10,dịch vụ\n'), mapping })).result;
    const errs = (await json(await call(h, `/product-imports/${change.import_id}/errors`))).body.data;
    expect(errs.map((e: { error: string }) => e.error)).toEqual(['type:immutable']);
  });

  it('SKU của sản phẩm đã lưu trữ → lỗi sku:archived, không hồi sinh', async () => {
    const p = ok(await act('product.create', { name: 'Hàng ngừng', type: 'physical', price: '5000', sku: 'OLD-9' })).result.product_id as string;
    ok(await act('product.archive', { product_id: p }));
    const r = ok(await confirmed({ file_id: await upload('hoi-sinh.csv', 'Tên,Giá,Mã\nHàng ngừng mới,6000,OLD-9\n'), mapping: MAP })).result;
    const errs = (await json(await call(h, `/product-imports/${r.import_id}/errors`))).body.data;
    expect(errs.map((e: { error: string }) => e.error)).toEqual(['sku:archived']);
    expect((await (await tenant()).product.findUniqueOrThrow({ where: { id: p } })).deletedAt).not.toBeNull();
  });
});

describe('biến thể có lịch sử', () => {
  it('product.update bỏ thuộc tính: biến thể có dòng đơn → lưu trữ (đơn cũ còn trỏ), chưa dùng → xoá; nhập không hồi sinh SKU lưu trữ', async () => {
    const p = ok(await act('product.create', { name: 'Áo polo', type: 'physical', price: '300000', sku: 'PL', attrs: [{ name: 'Size', values: ['M', 'L'] }] })).result.product_id as string;
    const db = await tenant();
    const vs = await db.productVariant.findMany({ where: { productId: p }, orderBy: { sku: 'asc' } });
    expect(vs).toHaveLength(2);
    const [used, unused] = vs;
    const contact = ok(await act('contact.create', { full_name: 'Khách polo', phone: '0909700001' })).result.contact_id;
    const o = ok(await act('order.create', { contact_id: contact, items: [{ name: 'Áo polo L', qty: 1, unit_price: '300000', tax_rate: 0, product_id: p }] })).result.order_id as string;
    await db.orderItem.updateMany({ where: { orderId: o }, data: { variantId: used!.id } });
    const cur = await db.product.findUniqueOrThrow({ where: { id: p } });
    ok(await act('product.update', { product_id: p, patch: { attrs: [] }, if_version: cur.version }));
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: used!.id } })).status).toBe('archived');
    expect(await db.productVariant.count({ where: { id: unused!.id } })).toBe(0);
    expect((await db.orderItem.findFirstOrThrow({ where: { orderId: o } })).variantId).toBe(used!.id);
    expect((await json(await call(h, `/products/${p}`))).body.data.variants).toEqual([]);
    // Biến thể lưu trữ không nhận sửa (INVALID_STATE) — chỉ hoàn tác lưu trữ hợp lệ mới mở lại.
    const upd = await act('product_variant.update', { variant_id: used!.id, patch: { price: '1' } });
    expect(upd.status).toBe(409);
    expect(upd.body.error.code).toBe('INVALID_STATE');
  });
});
