// TIP-020b trên Postgres 16 thật: thư mục KB — quyền kb.manage (sales 403), tenant khác 404, CAS hai lệnh cùng version một thắng,
// tên trùng khác dấu / hoa thường bị chặn ở server + unique index DB, cha = chính nó / con cháu → 422, xoá thư mục có nguồn / thùng rác /
// con → HAS_DEPENDENCIES không mất dữ liệu, hoàn tác xoá tạo lại; nguồn mới bỏ trống visibility kế thừa thư mục internal (action trực
// tiếp, không qua FE) và agent khách không tìm ra, explicit public giữ nguyên, đổi mặc định thư mục không đổi nguồn cũ; nguồn catalog
// update / remove / undo → CONFLICT không mutate, catalog-sync vẫn cập nhật đúng một nguồn; tải nguồn: bytes + sha256 khớp, tên UTF-8,
// nosniff / no-store, tenant khác / đã xoá / id lạ → 404 không byte, văn bản → .txt, URL → JSON mở tab (không tải website), catalog →
// sản phẩm; EXPLAIN tên / cha / nguồn theo thư mục.
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, kbDataSchema, kbSourceLinkSchema } from '@appchat/shared';
import { AiJobsModule, CLOCK, KernelModule, LOGGER, WalletService, createLogger, searchKb, syncProduct, uuidv7 } from '@appchat/core';
import { AiSdkEmbedder, mockEmbedSource } from '@appchat/ai';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let h2: Harness;
let ai: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}, hh = h) => call(hh, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tenant = (hh = h) => resolver.get(TenantContexts.system(hh.ws, 't'));
const raw = (path: string, hh = h, who?: { token: string }) =>
  fetch(`${hh.base}/v1${path}`, { headers: { 'x-workspace-id': hh.ws, authorization: `Bearer ${who ? who.token : hh.tokenFor(hh.user)}` } });

async function upload(name: string, body: Buffer, mime: string) {
  const form = new FormData();
  form.set('purpose', 'kb');
  form.set('file', new Blob([body], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.tokenFor(h.user)}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

beforeAll(async () => {
  [h, h2] = await Promise.all([startApi(), startApi()]);
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Worker ROLE=ai (kb-ingest, embedding giả tất định) — AC3 kiểm agent khách thật sự không tìm ra nguồn kế thừa internal.
  ai = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ai.init();
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 240_000);
afterAll(async () => {
  await ai?.close();
  await resolver?.close();
  await Promise.all([h?.close(), h2?.close()]);
});


/** TIP-020c: tìm theo restriction — `public` = người xem kênh; thêm `internal` = Owner (đọc mọi nhóm nguồn); thư mục / thẻ = phạm vi agent. */
const restrictionOf = (v: ('public' | 'internal')[], folderIds?: string[], tags?: string[]) => {
  const scope = folderIds?.length || tags?.length ? { folder_ids: folderIds ?? [], tags: tags ?? [] } : null;
  return { principal: v.includes('internal') ? { kind: 'user' as const, authz: authzForRole('owner', uuidv7()) } : { kind: 'public' as const }, admitted: scope, current: scope };
};

describe('AC1 / AC2 thư mục', () => {
  let a = '';
  let b = '';
  it('quyền + tenant: sales 403; thư mục tenant khác 404', async () => {
    a = (await ok('kb.folder.create', { name: 'Chính sách' })).result.folder_id;
    expect((await act('kb.folder.create', { name: 'X' }, as(sales))).status).toBe(403);
    expect((await act('kb.folder.update', { folder_id: a, name: 'Y' }, as(sales))).status).toBe(403);
    expect((await act('kb.folder.delete', { folder_id: a }, as(sales))).status).toBe(403);
    expect((await act('kb.folder.update', { folder_id: a, name: 'Lạ' }, {}, h2)).status).toBe(404);
    expect((await act('kb.folder.delete', { folder_id: a }, {}, h2)).status).toBe(404);
  });

  it('tên trùng khác dấu / hoa thường → 409 (create + update); unique index DB chặn cả khi bỏ qua kiểm', async () => {
    expect((await act('kb.folder.create', { name: '  CHINH SACH ' })).body.error.fields).toEqual({ name: 'duplicate' });
    b = (await ok('kb.folder.create', { name: 'Bảng giá' })).result.folder_id;
    expect((await act('kb.folder.update', { folder_id: b, name: 'chính sách' })).body.error.fields).toEqual({ name: 'duplicate' });
    const db = await tenant();
    await expect(db.kbFolder.create({ data: { id: uuidv7(), name: 'Chinh Sach' } })).rejects.toThrow(/kb_folder_name_key|Unique|23505/);
  });

  it('CAS: hai lệnh cùng version → một thắng, một STALE_VERSION', async () => {
    const v = (await (await tenant()).kbFolder.findUniqueOrThrow({ where: { id: b } })).version;
    const [x, y] = await Promise.all([act('kb.folder.update', { folder_id: b, name: 'Giá 1', if_version: v }), act('kb.folder.update', { folder_id: b, name: 'Giá 2', if_version: v })]);
    expect([x.status, y.status].sort()).toEqual([200, 409]);
    expect([x, y].find((r) => r.status === 409)!.body.error.code).toBe('STALE_VERSION');
    expect((await (await tenant()).kbFolder.findUniqueOrThrow({ where: { id: b } })).version).toBe(v + 1);
  });

  it('cây: cha = chính nó / con cháu → 422; chuyển hợp lệ được; hoàn tác sửa trả về', async () => {
    const c = (await ok('kb.folder.create', { name: 'Con', parent_id: a })).result.folder_id;
    expect((await act('kb.folder.update', { folder_id: a, parent_id: a })).body.error.fields).toEqual({ parent_id: 'self' });
    expect((await act('kb.folder.update', { folder_id: a, parent_id: c })).body.error.fields).toEqual({ parent_id: 'cycle' });
    const moved = await ok('kb.folder.update', { folder_id: b, parent_id: a });
    expect((await (await tenant()).kbFolder.findUniqueOrThrow({ where: { id: b } })).parentId).toBe(a);
    expect((await undo(moved.action_log_id)).status).toBe(200);
    expect((await (await tenant()).kbFolder.findUniqueOrThrow({ where: { id: b } })).parentId).toBeNull();
  });

  it('xoá: có nguồn / thùng rác / con → HAS_DEPENDENCIES, không mất gì; rỗng → xoá, hoàn tác tạo lại', async () => {
    const del = await act('kb.folder.delete', { folder_id: a });
    expect(del.status).toBe(409);
    expect(del.body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { children: '1' } });
    const t = (await ok('kb.folder.create', { name: 'Rác' })).result.folder_id;
    const s = (await ok('kb.add_source', { name: 'ghi chú', text: 'Nội dung tạm', folder_id: t })).result.source_id;
    await ok('kb.remove_source', { source_id: s });
    expect((await act('kb.folder.delete', { folder_id: t })).body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { sources: '0', trashed: '1' } });
    expect(await (await tenant()).kbSource.count({ where: { id: s } })).toBe(1);
    const e = (await ok('kb.folder.create', { name: 'Trống', visibility: 'internal' })).result.folder_id;
    const d = await ok('kb.folder.delete', { folder_id: e, if_version: 1 });
    expect(await (await tenant()).kbFolder.count({ where: { id: e } })).toBe(0);
    expect((await undo(d.action_log_id)).status).toBe(200);
    expect(await (await tenant()).kbFolder.findUniqueOrThrow({ where: { id: e } })).toMatchObject({ name: 'Trống', visibility: 'internal' });
  });
});

describe('AC3 kế thừa visibility', () => {
  it('bỏ trống → thư mục internal; explicit public giữ; đổi mặc định thư mục không đổi nguồn cũ; GET /settings/kb khớp schema', async () => {
    const f = (await ok('kb.folder.create', { name: 'Nội bộ', visibility: 'internal' })).result.folder_id;
    const db = await tenant();
    const inh = (await ok('kb.add_source', { name: 'Quy trình nội bộ', text: 'Mã cửa kho là 0000', folder_id: f })).result.source_id;
    const pub = (await ok('kb.add_source', { name: 'Giờ mở cửa', text: 'Mở cửa 8h', folder_id: f, visibility: 'public' })).result.source_id;
    const top = (await ok('kb.add_source', { name: 'Không thư mục', text: 'abc' })).result.source_id;
    expect((await db.kbSource.findUniqueOrThrow({ where: { id: inh } })).visibility).toBe('internal');
    expect((await db.kbSource.findUniqueOrThrow({ where: { id: pub } })).visibility).toBe('public');
    expect((await db.kbSource.findUniqueOrThrow({ where: { id: top } })).visibility).toBe('public');
    // Agent trả lời khách tìm với visibility ['public'] (kbVisibility) → không ra nguồn kế thừa internal; nội bộ thì ra.
    const status = async (id: string) => (await db.kbSource.findUniqueOrThrow({ where: { id } })).status;
    expect(await until(async () => ['ready', 'failed'].includes(await status(inh)))).toBe(true);
    expect(await status(inh)).toBe('ready');
    const search = (visibility: ('public' | 'internal')[]) => searchKb(db, new AiSdkEmbedder(mockEmbedSource()), { query: 'mã cửa kho', restriction: restrictionOf(visibility) });
    expect((await search(['public'])).chunks.some((c) => c.source_id === inh)).toBe(false);
    expect((await search(['public', 'internal'])).chunks.some((c) => c.source_id === inh)).toBe(true);
    // Preview Trợ lý (đường resolve cùng handler) cũng thấy internal khi bỏ trống.
    const pv = await act('kb.add_source', { name: 'Thử', text: 'x', folder_id: f }, { 'x-action-source': 'assistant' });
    expect(JSON.stringify(pv.body.data.preview ?? pv.body.data)).toContain('internal');
    await ok('kb.folder.update', { folder_id: f, visibility: 'public' });
    expect((await db.kbSource.findUniqueOrThrow({ where: { id: inh } })).visibility).toBe('internal');
    const kb = await json(await raw('/settings/kb?nav=all'));
    expect(kbDataSchema.safeParse(kb.body.data).success).toBe(true);
    expect(kb.body.data.folders.find((x: { id: string }) => x.id === f)).toMatchObject({ visibility: 'public', version: 2 });
  });
});

describe('AC4 nguồn catalog', () => {
  it('update / remove / undo → CONFLICT không đổi; catalog-sync vẫn cập nhật đúng một nguồn', async () => {
    const p = (await ok('product.create', { name: 'Gói chăm sóc tóc', type: 'service', price: '300000', description: 'Gội dưỡng' })).result.product_id;
    const db = await tenant();
    const deps = { push: async () => undefined, localeOf: async () => 'vi', now: () => h.clock.now() };
    expect(await syncProduct(db, h.ws, p, deps)).toBe('created');
    const src = await db.kbSource.findFirstOrThrow({ where: { productId: p, origin: 'catalog' } });
    const upd = await act('kb.update_source', { source_id: src.id, name: 'Sửa tay', visibility: 'internal' });
    expect(upd.status).toBe(409);
    expect(upd.body.error.fields).toMatchObject({ source_id: 'catalog_managed', reason: 'edit_product', product_id: p });
    expect((await act('kb.remove_source', { source_id: src.id })).body.error.fields.source_id).toBe('catalog_managed');
    expect((await act('kb.update_source', { source_id: src.id, name: 'x' }, { 'x-action-source': 'assistant' })).status).toBe(409);
    expect(await db.kbSource.findUniqueOrThrow({ where: { id: src.id } })).toMatchObject({ name: src.name, visibility: src.visibility, deletedAt: null });
    await ok('product.update', { product_id: p, patch: { description: 'Gội dưỡng thảo dược' } });
    expect(await syncProduct(db, h.ws, p, deps)).toBe('updated');
    expect(await db.kbSource.count({ where: { productId: p, origin: 'catalog' } })).toBe(1);
    expect((await db.kbSource.findUniqueOrThrow({ where: { id: src.id } })).body).toContain('thảo dược');
  });
});

describe('AC5 / AC6 tải nguồn', () => {
  it('tệp có dấu: bytes + sha256 khớp, filename UTF-8, nosniff, no-store; tenant khác / đã xoá / id lạ → 404 không byte', async () => {
    const bytes = Buffer.from('# Bảng giá Hè\nGói A 500.000đ\n', 'utf8');
    const fileId = await upload('Bảng giá Hè 2026.md', bytes, 'text/markdown');
    const sid = (await ok('kb.add_source', { name: 'Bảng giá Hè 2026.md', file_id: fileId })).result.source_id;
    const r = await raw(`/kb/sources/${sid}/download`);
    expect(r.status).toBe(200);
    const got = Buffer.from(await r.arrayBuffer());
    expect(createHash('sha256').update(got).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(r.headers.get('content-disposition')).toBe(`attachment; filename*=UTF-8''${encodeURIComponent('Bảng giá Hè 2026.md')}`);
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect((await raw(`/kb/sources/${sid}/download`, h, sales)).status).toBe(403);
    const other = await raw(`/kb/sources/${sid}/download`, h2);
    expect(other.status).toBe(404);
    expect(((await other.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
    // file_id thay cho source_id → không phải nguồn → 404 (không có đường tải theo file_id tự do).
    expect((await raw(`/kb/sources/${fileId}/download`)).status).toBe(404);
    expect((await raw('/kb/sources/khong-phai-uuid/download')).status).toBe(404);
    await ok('kb.remove_source', { source_id: sid });
    expect((await raw(`/kb/sources/${sid}/download`)).status).toBe(404);
  });

  it('văn bản → .txt; URL → JSON mở tab (http/https, không tải website); catalog → sản phẩm', async () => {
    const t = (await ok('kb.add_source', { name: 'Ghi chú lễ tân', text: 'Chào khách bằng tên.' })).result.source_id;
    const r = await raw(`/kb/sources/${t}/download`);
    expect(r.headers.get('content-type')).toMatch(/^text\/plain/);
    expect(r.headers.get('content-disposition')).toContain(encodeURIComponent('Ghi chú lễ tân.txt'));
    expect(await r.text()).toBe('Chào khách bằng tên.');
    const u = (await ok('kb.add_source', { name: 'Trang dịch vụ', url: 'https://example.invalid/dich-vu' })).result.source_id;
    const ru = await raw(`/kb/sources/${u}/download`);
    expect(ru.headers.get('content-type')).toMatch(/^application\/json/);
    expect(kbSourceLinkSchema.parse(((await ru.json()) as { data: unknown }).data)).toEqual({ kind: 'url', url: 'https://example.invalid/dich-vu' });
    const db = await tenant();
    const cat = await db.kbSource.findFirstOrThrow({ where: { origin: 'catalog' } });
    const rc = await raw(`/kb/sources/${cat.id}/download`);
    expect(kbSourceLinkSchema.parse(((await rc.json()) as { data: unknown }).data)).toEqual({ kind: 'product', product_id: cat.productId });
  });
});

describe('EXPLAIN', () => {
  it('tên thư mục dùng unique expression; cha dùng parent_id; đếm nguồn sống / thùng rác dùng hai partial', async () => {
    const db = await tenant();
    const plan = async (sql: string) =>
      db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
        return (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
      });
    expect(await plan(`SELECT id FROM kb_folder WHERE f_unaccent(lower(btrim(name))) = f_unaccent(lower(btrim('Chính sách')))`)).toMatch(/kb_folder_name_key/);
    expect(await plan(`SELECT id FROM kb_folder WHERE parent_id = '00000000-0000-0000-0000-000000000000'`)).toMatch(/kb_folder_parent_id_idx/);
    const z = `'00000000-0000-0000-0000-000000000000'`;
    expect(await plan(`SELECT count(*) FROM kb_source WHERE folder_id = ${z} AND deleted_at IS NULL`)).toMatch(/kb_source_folder_status_idx/);
    expect(await plan(`SELECT count(*) FROM kb_source WHERE folder_id = ${z} AND deleted_at IS NOT NULL`)).toMatch(/kb_source_folder_trash_idx/);
  });
});
