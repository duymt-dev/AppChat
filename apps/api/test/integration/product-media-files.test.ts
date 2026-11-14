// TIP-027b pha 2 trên Postgres 16 + Memurai + bundle kiểm cấu trúc thật (build api một lần): media riêng tư của sản phẩm. Tải ảnh cho đúng
// sản phẩm (catalog.manage) → gắn (ảnh đầu = ảnh chính) → tải về đúng bytes qua route kiểm quyền sản phẩm; ảnh động / quá cỡ bị từ chối;
// đổi ảnh chính / gỡ ảnh chính → ảnh kế; sắp xếp chỉ nhận hoán vị đủ; version lệch → 409; tệp đã gắn sản phẩm không gắn sang đơn; link ký
// raw từ chối; hoàn tác tạo sản phẩm sau khi đã có media → 409 HAS_DEPENDENCIES; sales (catalog.view) đọc, không ghi. EXPLAIN 100k.
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENC_KEY, setValidatorEntry, signedFileUrl, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { pngOf, webpOf } from '../../../../fixtures/product-media/images';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
const api = join(import.meta.dirname, '..', '..');
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const as = (t?: string) => ({ authorization: `Bearer ${t ?? h.tokenFor(h.user)}` });
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json() });
const act = (id: string, input: unknown, token?: string) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(token) }).then(json);
const ok = (r: Res) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data as { result: any; action_log_id: string }; // eslint-disable-line @typescript-eslint/no-explicit-any
};

async function upload(productId: string, name: string, body: Uint8Array, mime: string, token?: string): Promise<Res> {
  const form = new FormData();
  form.set('purpose', 'record_attachment');
  form.set('parent_type', 'product');
  form.set('parent_id', productId);
  form.set('file', new Blob([body], { type: mime }), name);
  return json(await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...as(token) }, body: form }));
}
const handle = (fileId: string) => ({ kind: 'target_upload_handle', file_id: fileId });
const media = async (productId: string) => ok(await act('product.media_list', { product_id: productId })).result as { items: { media_id: string; file_id: string; kind: string; is_primary: boolean; position: number }[]; version: number };
async function attach(productId: string, name: string, body: Uint8Array, mime: string) {
  const up = await upload(productId, name, body, mime);
  expect(up.status, JSON.stringify(up.body)).toBe(201);
  return act('product.media_attach', { product_id: productId, source: handle(up.body.data.file_id), if_version: (await media(productId)).version });
}
const product = async (name: string) => ok(await act('product.create', { name, type: 'physical', price: '100000' })) as { result: { product_id: string }; action_log_id: string };

beforeAll(async () => {
  execFileSync(process.execPath, [join(api, 'node_modules', 'tsup', 'dist', 'cli-default.js'), '--silent'], { cwd: api, stdio: 'ignore' });
  setValidatorEntry(join(api, 'dist', 'attachment-validator.cjs'));
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  sales = await h.member('sales');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await resolver?.close();
  await h?.close();
});

describe('media sản phẩm — gắn / ảnh chính / tải bytes', () => {
  it('ảnh đầu = ảnh chính; tài liệu không thành ảnh chính; tải về đúng bytes; chi tiết có khối media; giá / version sản phẩm không đổi', async () => {
    const p = (await product('Serum ảnh')).result.product_id;
    const img = pngOf(640, 480);
    const a = ok(await attach(p, 'serum.png', img, 'image/png')).result;
    expect(a).toMatchObject({ kind: 'image', version: 1, primary_id: a.media_id, reused: false });
    const d = ok(await attach(p, 'hdsd.pdf', new Uint8Array(pdf({ text: 'HDSD' })), 'application/pdf')).result;
    expect(d).toMatchObject({ kind: 'document', primary_id: a.media_id });
    const r = await fetch(`${h.base}/v1/files/${a.file_id}`, { headers: { 'x-workspace-id': h.ws, ...as() } });
    expect(r.status).toBe(200);
    expect(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')).toBe(createHash('sha256').update(img).digest('hex'));
    const det = (await json(await call(h, `/products/${p}`))).body.data;
    expect(det.media).toMatchObject({ version: 2, can_edit: true, limits: { image: 10, document: 20 } });
    expect(det.media.items.map((x: { kind: string }) => x.kind).sort()).toEqual(['document', 'image']);
    expect(JSON.stringify(det.media)).not.toMatch(/https?:|storage/);
    const row = await (await tenant()).product.findUniqueOrThrow({ where: { id: p }, select: { version: true, price: true } });
    expect([row.version, String(row.price)]).toEqual([1, '100000']);
    // Sales chỉ catalog.view: đọc + tải được, không tải lên / gắn.
    expect((await fetch(`${h.base}/v1/files/${a.file_id}`, { headers: { 'x-workspace-id': h.ws, ...as(sales.token) } })).status).toBe(200);
    expect((await upload(p, 'x.png', img, 'image/png', sales.token)).status).toBe(403);
  });

  it('ảnh động / quá cỡ / SVG giả PNG → từ chối có lý do, không thêm dòng', async () => {
    const p = (await product('Ảnh xấu')).result.product_id;
    expect((await attach(p, 'dong.webp', webpOf(20, 20, true), 'image/webp')).body.error.fields).toEqual({ file_id: 'animated' });
    expect((await attach(p, 'lon.png', pngOf(9000, 100), 'image/png')).body.error.fields).toEqual({ file_id: 'image_too_large' });
    const svg = await upload(p, 'a.png', new TextEncoder().encode('<svg onload="x()"></svg>'), 'image/png');
    expect(svg.status).toBeGreaterThanOrEqual(400);
    expect((await media(p)).items).toHaveLength(0);
  });

  it('đổi ảnh chính → một ảnh chính; gỡ ảnh chính → ảnh kế; sắp xếp chỉ hoán vị đủ; version lệch → 409', async () => {
    const p = (await product('Ba ảnh')).result.product_id;
    const ids: string[] = [];
    for (const n of ['1', '2', '3']) ids.push(ok(await attach(p, `a${n}.png`, pngOf(100 + Number(n), 100), 'image/png')).result.media_id);
    let v = (await media(p)).version;
    ok(await act('product.media_set_primary', { product_id: p, media_id: ids[2], if_version: v }));
    let m = await media(p);
    expect(m.items.filter((x) => x.is_primary).map((x) => x.media_id)).toEqual([ids[2]]);
    expect((await act('product.media_reorder', { product_id: p, kind: 'image', media_ids: [ids[0], ids[1]], if_version: m.version })).body.error.fields).toEqual({ media_ids: 'not_permutation' });
    ok(await act('product.media_reorder', { product_id: p, kind: 'image', media_ids: [ids[1], ids[0], ids[2]], if_version: m.version }));
    m = await media(p);
    expect(m.items.map((x) => x.media_id)).toEqual([ids[1], ids[0], ids[2]]);
    const stale = await act('product.media_detach', { product_id: p, media_id: ids[2], if_version: m.version - 1 });
    expect([stale.status, stale.body.error.code]).toEqual([409, 'STALE_VERSION']);
    v = m.version;
    expect(ok(await act('product.media_detach', { product_id: p, media_id: ids[2], if_version: v })).result.primary_id).toBe(ids[1]);
    expect(await (await tenant()).file.count({ where: { id: m.items.find((x) => x.media_id === ids[2])!.file_id } })).toBe(1);
  });
});

describe('media sản phẩm — ranh giới', () => {
  it('tệp đã gắn sản phẩm không gắn sang sản phẩm khác; link ký raw từ chối; hoàn tác tạo sau khi có media → 409', async () => {
    const created = await product('Có media');
    const p = created.result.product_id;
    const q = (await product('Khác')).result.product_id;
    const a = ok(await attach(p, 'x.png', pngOf(50, 50), 'image/png')).result;
    const cross = await act('product.media_attach', { product_id: q, source: handle(a.file_id), if_version: 0 });
    expect(cross.status).toBeGreaterThanOrEqual(400);
    const raw = await fetch(signedFileUrl(h.base, h.app.get<Buffer>(ENC_KEY, { strict: false }), h.ws, a.file_id));
    expect(raw.status).toBe(404);
    ok(await act('product.media_detach', { product_id: p, media_id: a.media_id, if_version: (await media(p)).version }));
    const undo = await json(await call(h, `/action-logs/${created.action_log_id}/undo`, {}));
    expect([undo.status, undo.body.error?.code]).toEqual([409, 'HAS_DEPENDENCIES']);
    // Sản phẩm chưa từng có media → hoàn tác tạo vẫn được.
    const clean = await product('Sạch');
    expect((await call(h, `/action-logs/${clean.action_log_id}/undo`, {})).status).toBe(200);
  });

  it('EXPLAIN 100k: danh sách theo sản phẩm + loại dùng index một phần, không Seq Scan / Sort', async () => {
    const p = (await product('Đo index')).result.product_id;
    const other = (await product('Đo index khác')).result.product_id;
    const c = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await c.connect();
    const plan = async (sql: string, args: unknown[]) => (await c.query(`EXPLAIN ${sql}`, args)).rows.map((x) => x['QUERY PLAN']).join('\n');
    try {
      await c.query(`INSERT INTO product_media (id, product_id, file_id, kind, position, created_at, detached_at)
        SELECT gen_random_uuid(), (CASE WHEN g % 100 = 0 THEN $1 ELSE $2 END)::uuid, gen_random_uuid(), (CASE WHEN g % 3 = 0 THEN 'document' ELSE 'image' END)::product_media_kind,
               g, now(), CASE WHEN g % 10 = 0 THEN now() END
          FROM generate_series(1, 100000) g`, [p, other]);
      await c.query('ANALYZE product_media');
      const list = await plan(`SELECT id, file_id, kind, position, is_primary, version, created_at FROM product_media
        WHERE product_id = $1::uuid AND kind = 'image' AND detached_at IS NULL ORDER BY position, id LIMIT 50`, [p]);
      expect(list).toMatch(/product_media_list_idx/);
      expect(list).not.toMatch(/Seq Scan|Sort/);
      expect(await plan('SELECT id FROM product_media WHERE file_id = $1::uuid AND detached_at IS NULL LIMIT 1', [p])).toMatch(/product_media_file_idx/);
    } finally {
      await c.query('DELETE FROM product_media WHERE created_by IS NULL');
      await c.end();
    }
  });
});
