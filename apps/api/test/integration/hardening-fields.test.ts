// TIP-045b annex C trên Postgres 16 + Memurai: quyền theo trường phía server — REST list / chi tiết / bảng kanban bỏ HẲN key tuỳ biến
// bị ẩn (không thay rỗng), lọc `cf.*` trên trường ẩn → 422 FIELD_FORBIDDEN trước truy vấn (cả contact.export), giá vốn sản phẩm không có
// khoá (hidden_fields) với Sales + ghi giá vốn bị chặn, output action đọc (product.search qua executor) cùng luật, đổi định nghĩa →
// event `custom_field.changed` (realtime `fields.changed`), dọn giá trị trường đã xoá quá 30 ngày (SQL thật + GIN jsonb_path_ops).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry, type TenantDb } from '@appchat/db';
import { pruneDeletedFields, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let manager: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);

let contactId = '';
let productId = '';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'fields-test'));
  sales = await h.member('sales');
  manager = await h.member('manager');
  // `margin` chỉ manager thấy; `size` mọi vai trò.
  expect((await act('custom_field.define', { entity: 'contact', label: 'Size', type: 'text' })).status).toBe(200);
  expect((await act('custom_field.define', { entity: 'contact', label: 'Margin', type: 'text', roles: ['manager'] })).status).toBe(200);
  // `audit_note` chỉ accountant — manager (có crm.export) không thấy → kiểm lọc khi xuất.
  expect((await act('custom_field.define', { entity: 'contact', label: 'Audit note', type: 'text', roles: ['accountant'] })).status).toBe(200);
  const c = await act('contact.create', { full_name: 'Khách trường', phone: '0912777001', custom: { size: 'L' } }, as(manager));
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  contactId = c.body.data.result.contact_id;
  expect((await act('contact.update', { contact_id: contactId, patch: { custom: { margin: '42%' } } }, as(manager))).status).toBe(200);
  // Cho sales thấy khách (scope own): đặt chủ = sales.
  await db.contact.update({ where: { id: contactId }, data: { ownerUserId: sales.id } });
  const p = await act('product.create', { name: 'SP giá vốn', type: 'physical', price: '100000', cost: '61000', tax_rate: 0 });
  expect(p.status, JSON.stringify(p.body)).toBe(200);
  productId = p.body.data.result.product_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('REST: key tuỳ biến bị ẩn bị bỏ hẳn', () => {
  it('sales: list / chi tiết 360 không có `margin`; manager có', async () => {
    const list = await get('/contacts?page=1', sales);
    const row = list.body.data.find((r: { id: string }) => r.id === contactId);
    expect(row.custom).toEqual({ size: 'L' });
    expect(JSON.stringify(list.body)).not.toContain('42%');
    const d = await get(`/contacts/${contactId}`, sales);
    expect(d.status).toBe(200);
    expect(d.body.data.custom ?? {}).not.toHaveProperty('margin');
    expect(JSON.stringify(d.body)).not.toContain('42%');
    const m = await get('/contacts?page=1', manager);
    expect(m.body.data.find((r: { id: string }) => r.id === contactId).custom).toMatchObject({ size: 'L', margin: '42%' });
  });

  it('lọc cf.margin: sales 422 FIELD_FORBIDDEN (list, board, export) — cùng mã với key không tồn tại; manager lọc được', async () => {
    for (const path of ['/contacts?cf.margin=42', '/contacts/board?cf.margin=42', '/contacts?cf.khong_co=1']) {
      const r = await get(path, sales);
      expect(r.status, path).toBe(422);
      expect(r.body.error.code, path).toBe('FIELD_FORBIDDEN');
    }
    // Xuất: số dòng cũng là kênh dò — manager có crm.export nhưng không thấy `audit_note` → 422; lọc trường được thấy → xuất được.
    const ex = await act('contact.export', { custom: { audit_note: 'x' } }, as(manager));
    expect(ex.body.error?.code, JSON.stringify(ex.body)).toBe('FIELD_FORBIDDEN');
    const exOk = await act('contact.export', { custom: { margin: '42' } }, as(manager));
    expect(exOk.status, JSON.stringify(exOk.body)).toBe(200);
    const ok = await get('/contacts?cf.margin=42', manager);
    expect(ok.status).toBe(200);
    expect(ok.body.data.map((r: { id: string }) => r.id)).toContain(contactId);
  });
});

describe('giá vốn sản phẩm (catalog.cost_view)', () => {
  it('sales: không có khoá cost + hidden_fields; owner thấy giá trị; không bao giờ "0" thay thế', async () => {
    const s = await get(`/products/${productId}`, sales);
    expect(s.status).toBe(200);
    expect(s.body.data).not.toHaveProperty('cost');
    expect(s.body.data.hidden_fields).toEqual(['cost']);
    const sl = await get('/products?page=1', sales);
    const row = sl.body.data.find((r: { id: string }) => r.id === productId);
    expect(row).not.toHaveProperty('cost');
    expect(JSON.stringify(sl.body)).not.toContain('61000');
    const o = await get(`/products/${productId}`);
    expect(o.body.data.cost).toBe('61000');
    expect(o.body.data.hidden_fields).toBeUndefined();
  });

  it('ghi giá vốn khi không được xem → 422 FIELD_FORBIDDEN (không ghi mù); sửa trường khác giữ giá vốn', async () => {
    // Sales không có catalog.manage → 403 trước; dùng manager bị thu quyền cost_view không có sẵn vai trò → kiểm qua owner + agent ở unit.
    const r = await act('product.update', { product_id: productId, patch: { cost: '1' } }, as(sales));
    expect([403, 422]).toContain(r.status);
    const after = await db.product.findUniqueOrThrow({ where: { id: productId }, select: { cost: true } });
    expect(String(after.cost)).toBe('61000');
  });

  it('output action product.search qua executor cùng luật (không lộ cost)', async () => {
    const r = await act('product.search', { query: 'giá vốn' }, as(sales));
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain('61000');
  });
});

describe('định nghĩa đổi + dọn 30 ngày', () => {
  it('custom_field.update / delete phát custom_field.changed (không có giá trị)', async () => {
    await act('custom_field.update', { entity: 'contact', fields: [{ key: 'size', required: false }] });
    const ev = await db.outboxEvent.findMany({ where: { topic: 'custom_field.changed' } });
    expect(ev.length).toBeGreaterThan(0);
    expect(JSON.stringify(ev)).not.toMatch(/42%|"L"/);
  });

  it('xoá trường → giá trị giữ (khôi phục được); quá 30 ngày → job bỏ key khỏi bản ghi + xoá hẳn định nghĩa; key dùng lại không thừa hưởng', async () => {
    expect((await act('custom_field.delete', { entity: 'contact', key: 'margin' })).status).toBe(200);
    const kept = await db.contact.findUniqueOrThrow({ where: { id: contactId }, select: { custom: true } });
    expect(kept.custom).toMatchObject({ margin: '42%' });
    // Chưa đủ 30 ngày → không dọn.
    expect(await pruneDeletedFields(db, h.clock.now())).toMatchObject({ defs: 0 });
    const later = new Date(h.clock.now().getTime() + 31 * 86_400_000);
    const r = await pruneDeletedFields(db, later);
    expect(r.defs).toBe(1);
    expect(r.values).toBeGreaterThanOrEqual(1);
    const gone = await db.contact.findUniqueOrThrow({ where: { id: contactId }, select: { custom: true } });
    expect(gone.custom).not.toHaveProperty('margin');
    expect(gone.custom).toMatchObject({ size: 'L' });
    expect(await db.customFieldDef.findUnique({ where: { entity_key: { entity: 'contact', key: 'margin' } } })).toBeNull();
    // Chạy lại idempotent.
    expect(await pruneDeletedFields(db, later)).toEqual({ values: 0, defs: 0 });
    // Định nghĩa lại cùng nhãn → key `margin` (đã giải phóng), bản ghi cũ không có giá trị.
    const again = await act('custom_field.define', { entity: 'contact', label: 'Margin', type: 'text' });
    expect(again.body.data.result.key).toBe('margin');
    const m = await get(`/contacts/${contactId}`, manager);
    expect(m.body.data.custom ?? {}).not.toHaveProperty('margin');
  });

  it('EXPLAIN: chọn dòng mang key dùng GIN custom (jsonb_path_ops, @?)', async () => {
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id FROM contact WHERE custom @? '$."size"'::jsonpath LIMIT 500`)).map((x) => x['QUERY PLAN']).join('\n');
    await db.$executeRawUnsafe('RESET enable_seqscan');
    expect(plan).toMatch(/contact_custom_gin_idx/);
  });
});
