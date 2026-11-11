// TIP-006b AC5 trên Postgres thật: nguồn catalog + ý định nạp (kb_source pending + ingest_seq) commit rồi đẩy job lỗi → phát lại event
// với nội dung KHÔNG đổi vẫn đẩy lại đúng lần nạp đang chờ (không mất nạp); quét khôi phục mọi nguồn pending quá hạn đẩy lại đúng seq;
// nguồn đã ready không đổi → không nạp lại (không tốn credit); sửa sản phẩm → seq mới (công bố của seq cũ bị kb.system_publish từ chối).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { catalogSyncConsumer, recoverIngest, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ev = (productId: string) => ({ id: uuidv7(), topic: 'product.changed', workspaceId: h.ws, payload: { product_id: productId }, traceId: null });

describe('catalog → nạp kho tri thức bền (AC5)', () => {
  it('đẩy lỗi sau commit → phát lại không đổi vẫn đẩy đúng seq; quét khôi phục; đã ready không nạp lại; sửa → seq mới', async () => {
    const r = await call(h, '/actions/product.create', { input: { name: 'Gội đầu dưỡng sinh', type: 'service', price: '200000', unit: 'lượt', duration_min: 45 } }, { 'idempotency-key': uuidv7() });
    const productId = ((await r.json()) as { data: { result: { product_id: string } } }).data.result.product_id;
    const db = await tenant();
    const pushed: { id: string; seq: number }[] = [];
    let fail = true;
    const deps = { push: async (_ws: string, s: { id: string; seq: number }[]) => (fail ? Promise.reject(new Error('redis down')) : void pushed.push(...s)), localeOf: async () => 'vi', now: () => h.clock.now() };
    const c = catalogSyncConsumer(deps);
    await expect(c.handle(ev(productId), db)).rejects.toThrow('redis down');
    const src = await db.kbSource.findFirstOrThrow({ where: { productId, origin: 'catalog' } });
    expect([src.status, src.ingestSeq]).toEqual(['pending', 1]);
    // Phát lại (nội dung không đổi) → vẫn đẩy lần nạp đang chờ.
    fail = false;
    await c.handle(ev(productId), db);
    expect(pushed).toEqual([{ id: src.id, seq: 1 }]);
    // Quét khôi phục: chưa quá hạn → không; quá hạn → đẩy lại đúng seq.
    pushed.length = 0;
    expect(await recoverIngest(db, h.ws, deps.push, h.clock.now())).toBe(0);
    expect(await recoverIngest(db, h.ws, deps.push, new Date(h.clock.now().getTime() + 5 * 60_000))).toBeGreaterThanOrEqual(1);
    expect(pushed).toContainEqual({ id: src.id, seq: 1 });
    // Đã nạp xong (ready) + không đổi → không đẩy (không tốn credit nạp lại).
    await db.kbSource.update({ where: { id: src.id }, data: { status: 'ready' } });
    pushed.length = 0;
    await c.handle(ev(productId), db);
    expect(pushed).toEqual([]);
    // Sửa mô tả → lần nạp mới (seq 2) — bản nạp cũ không còn hiện hành.
    h.clock.advance(1000);
    await call(h, '/actions/product.update', { input: { product_id: productId, patch: { description: 'Thư giãn vai gáy' } } }, { 'idempotency-key': uuidv7() });
    await c.handle(ev(productId), db);
    expect(pushed).toEqual([{ id: src.id, seq: 2 }]);
  });
});
