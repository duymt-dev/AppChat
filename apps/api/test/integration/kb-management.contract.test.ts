// TIP-020b — contract FE ↔ BE quản lý nguồn KB trên HTTP thật: GET /v1/settings/kb parse đúng `kbDataSchema` (thư mục có visibility /
// version / parent_id, nguồn có origin); output kb.folder.* parse đúng `ActionDef.output`; tải nguồn URL / catalog parse `kbSourceLinkSchema`;
// lỗi STALE_VERSION / HAS_DEPENDENCIES / CONFLICT catalog_managed theo envelope chung. Đổi DTO một phía mà không đổi schema chung → đỏ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getAction } from '@appchat/actions';
import { ERROR_CODES, kbDataSchema, kbSourceLinkSchema } from '@appchat/shared';
import { syncProduct, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data.result;
};
const errorEnvelope = z.object({ error: z.object({ code: z.enum(ERROR_CODES), message: z.string(), fields: z.record(z.string(), z.string()).optional() }).strict() }).strict();
const raw = (path: string) => fetch(`${h.base}/v1${path}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.tokenFor(h.user)}` } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('kb-management contract', () => {
  it('GET /settings/kb + output kb.folder.* ↔ zod chung', async () => {
    const c = await ok('kb.folder.create', { name: 'Hợp đồng mẫu', visibility: 'internal' });
    expect(getAction('kb.folder.create')!.output.safeParse(c).success).toBe(true);
    const u = await ok('kb.folder.update', { folder_id: c.folder_id, name: 'Hợp đồng', if_version: 1 });
    expect(getAction('kb.folder.update')!.output.safeParse(u).success).toBe(true);
    await ok('kb.add_source', { name: 'Mẫu HĐ', text: 'Điều 1', folder_id: c.folder_id });
    const kb = await json(await raw('/settings/kb?nav=all'));
    const p = kbDataSchema.safeParse(kb.body.data);
    expect(p.success, JSON.stringify(p.error?.issues?.slice(0, 3))).toBe(true);
    expect(kb.body.data.folders[0]).toMatchObject({ id: c.folder_id, visibility: 'internal', parent_id: null, version: 2 });
    expect(kb.body.data.data[0]).toMatchObject({ origin: 'text', visibility: 'internal' });
    const e = await ok('kb.folder.create', { name: 'Trống' });
    expect(getAction('kb.folder.delete')!.output.safeParse(await ok('kb.folder.delete', { folder_id: e.folder_id })).success).toBe(true);
  });

  it('lỗi theo envelope: STALE_VERSION · HAS_DEPENDENCIES · CONFLICT catalog_managed · 404 tải', async () => {
    const f = (await ok('kb.folder.create', { name: 'Đang dùng' })).folder_id;
    await ok('kb.add_source', { name: 'x', text: 'y', folder_id: f });
    const stale = await act('kb.folder.update', { folder_id: f, name: 'Z', if_version: 7 });
    expect([stale.status, stale.body.error.code]).toEqual([409, 'STALE_VERSION']);
    expect(errorEnvelope.safeParse(stale.body).success).toBe(true);
    const dep = await act('kb.folder.delete', { folder_id: f });
    expect([dep.status, dep.body.error.code]).toEqual([409, 'HAS_DEPENDENCIES']);
    expect(errorEnvelope.safeParse(dep.body).success).toBe(true);
    const pid = (await ok('product.create', { name: 'Dịch vụ hợp đồng', type: 'service', price: '100000' })).product_id;
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    await syncProduct(db, h.ws, pid, { push: async () => undefined, localeOf: async () => 'vi', now: () => h.clock.now() });
    const cat = await db.kbSource.findFirstOrThrow({ where: { productId: pid } });
    const conflict = await act('kb.remove_source', { source_id: cat.id });
    expect(errorEnvelope.safeParse(conflict.body).success).toBe(true);
    expect(conflict.body.error.fields).toMatchObject({ source_id: 'catalog_managed' });
    expect(kbSourceLinkSchema.parse(((await (await raw(`/kb/sources/${cat.id}/download`)).json()) as { data: unknown }).data)).toEqual({ kind: 'product', product_id: pid });
    const nf = await raw(`/kb/sources/${uuidv7()}/download`);
    expect(nf.status).toBe(404);
    expect(errorEnvelope.safeParse(await nf.json()).success).toBe(true);
  });
});
