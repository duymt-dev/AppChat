// TIP-031c AC1–AC4 + COMMERCE §4b L109 / Q8: bên giữ tồn chuẩn (`appchat` | `external`) trên kết nối `order_sync` (`mock_marketplace`).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import type { ExternalOrder } from '@appchat/integrations';
import { productActivitySchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let serumId: string;
let lanId: string;

const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, who?: { id: string }) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const extOrder = (id: string, status: string, at: string, qty = 1): ExternalOrder => ({
  external_id: id,
  platform: 'shopee',
  platform_status: status,
  buyer: { id: `b-${id}`, name: 'Khách sàn' },
  lines: [{ sku: 'SR-EXT', name: 'Serum B5', qty, unit_price: '500000' }],
  total: String(500000 * qty),
  paid: false,
  created_at: at,
  updated_at: at,
});

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  lanId = ok(await act('contact.create', { full_name: 'Chị Lan', phone: '0909310001' })).contact_id as string;
  serumId = ok(await act('product.create', { name: 'Serum B5 Ext', type: 'physical', price: '500000', stock: 10, sku: 'SR-EXT' })).product_id as string;
}, 90_000);

afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('TIP-031c — Bên giữ tồn chuẩn (stock_master)', () => {
  it('AC1: mặc định appchat giữ nguyên trừ/hoàn kho đơn sàn và bỏ qua pullStock', async () => {
    const at = h.clock.now().toISOString();
    ok(
      await act('integration.connect', {
        provider: 'mock_marketplace',
        mode: 'sandbox',
        fields: {
          api_key: 'mk_1',
          shop_id: 'shop_1',
          orders: JSON.stringify([extOrder('ORD-APP-1', 'READY_TO_SHIP', at, 1)]),
          stock_snapshots: JSON.stringify([{ sku: 'SR-EXT', on_hand: 3, as_of: at, snapshot_id: 'snap-ignored' }]),
        },
      }),
    );
    const r = ok(await act('order.sync_now', {}));
    expect(r.imported).toBe(1);
    expect(r.stock_adjusted).toBeUndefined();

    const db = await tenant();
    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(9);
    expect(await db.stockMovement.count({ where: { productId: serumId, kind: 'sync_adjust' } })).toBe(0);

    // Huỷ đơn ở sàn ở lượt kéo sau → hoàn kho (9 -> 10).
    h.clock.advance(60_000);
    const at2 = h.clock.now().toISOString();
    ok(
      await act('integration.connect', {
        provider: 'mock_marketplace',
        mode: 'sandbox',
        fields: {
          api_key: 'mk_1',
          shop_id: 'shop_1',
          orders: JSON.stringify([extOrder('ORD-APP-1', 'CANCELLED', at2, 1)]),
          stock_snapshots: JSON.stringify([{ sku: 'SR-EXT', on_hand: 3, as_of: at2, snapshot_id: 'snap-ignored' }]),
        },
      }),
    );
    ok(await act('order.sync_now', {}));
    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(10);
  });

  it('AC2 + Q8: chuyển sang external → kéo snapshot ghi sync_adjust, idempotent theo snapshot_id, đơn vẫn trừ kho', async () => {
    const db = await tenant();
    expect((await act('integration.update_settings', { provider: 'mock_marketplace', stock_master: 'external' }, sales)).status).toBe(403);
    ok(await act('integration.update_settings', { provider: 'mock_marketplace', stock_master: 'external' }));

    // Xoay khoá không truyền stock_master vẫn giữ nguyên `'external'`.
    const at = h.clock.now().toISOString();
    ok(
      await act('integration.connect', {
        provider: 'mock_marketplace',
        mode: 'sandbox',
        fields: {
          api_key: 'mk_1',
          shop_id: 'shop_1',
          orders: '[]',
          stock_snapshots: JSON.stringify([
            { sku: 'sr-ext', on_hand: 7, as_of: at, snapshot_id: 'snap-1' },
            { sku: 'NO-SUCH-SKU', on_hand: 4, as_of: at, snapshot_id: 'snap-1' },
          ]),
        },
      }),
    );
    const r1 = ok(await act('order.sync_now', {}));
    expect(r1.stock_adjusted).toBe(1);
    expect(r1.unmatched_skus).toEqual(['NO-SUCH-SKU']);

    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(7);
    const adj1 = await db.stockMovement.findMany({ where: { productId: serumId, kind: 'sync_adjust' } });
    expect(adj1).toHaveLength(1);
    expect(adj1[0]!.qty).toBe(-3);
    expect(await db.product.count({ where: { code: 'NO-SUCH-SKU' } })).toBe(0);

    // GET /products/:id/activity hiện dòng sync_adjust.
    const actv = productActivitySchema.parse((await get(`/products/${serumId}/activity`)).body.data);
    expect(actv.some((x) => x.kind === 'stock' && x.text.includes('-3'))).toBe(true);

    // Q8: trong chế độ `external`, tạo + xác nhận đơn AppChat vẫn trừ kho (7 -> 5).
    const ord = ok(
      await act('order.create', {
        contact_id: lanId,
        items: [{ product_id: serumId, name: 'Serum B5 Ext', qty: 2, unit_price: '500000', tax_rate: 0 }],
      }),
    ).order_id as string;
    ok(await act('order.confirm', { order_id: ord }));
    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(5);

    // Đồng bộ lại đúng snapshot_id `snap-1` → bỏ qua (không ghi sync_adjust lần hai, tồn giữ 5).
    const rReplay = ok(await act('order.sync_now', {}));
    expect(rReplay.stock_adjusted).toBeUndefined();
    expect(await db.stockMovement.count({ where: { productId: serumId, kind: 'sync_adjust' } })).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(5);

    // AC3 + snapshot mới: tạo SP cho SKU chưa khớp rồi đồng bộ snapshot `snap-2` → cả 2 SP được đối soát.
    const newProdId = ok(await act('product.create', { name: 'Kem mới', type: 'physical', price: '300000', stock: 1, sku: 'NO-SUCH-SKU' })).product_id as string;
    ok(
      await act('integration.connect', {
        provider: 'mock_marketplace',
        mode: 'sandbox',
        fields: {
          api_key: 'mk_1',
          shop_id: 'shop_1',
          orders: '[]',
          stock_snapshots: JSON.stringify([
            { sku: 'SR-EXT', on_hand: 12, as_of: at, snapshot_id: 'snap-2' },
            { sku: 'NO-SUCH-SKU', on_hand: 4, as_of: at, snapshot_id: 'snap-2' },
          ]),
        },
      }),
    );
    const r2 = ok(await act('order.sync_now', {}));
    expect(r2.stock_adjusted).toBe(2);
    expect(r2.unmatched_skus).toBeUndefined();
    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(12);
    expect((await db.product.findUniqueOrThrow({ where: { id: newProdId }, select: { stock: true } })).stock).toBe(4);
  });

  it('AC4: chuyển lại appchat không đụng lastSyncAt, không xoá movement cũ, lượt sau không kéo snapshot', async () => {
    const db = await tenant();
    const before = await db.integrationConnection.findFirstOrThrow({ where: { connectorKey: 'mock_marketplace' }, select: { lastSyncAt: true } });
    const countBefore = await db.stockMovement.count({ where: { productId: serumId, kind: 'sync_adjust' } });

    ok(await act('integration.update_settings', { provider: 'mock_marketplace', stock_master: 'appchat' }));
    const after = await db.integrationConnection.findFirstOrThrow({ where: { connectorKey: 'mock_marketplace' }, select: { lastSyncAt: true } });
    expect(after.lastSyncAt?.toISOString()).toBe(before.lastSyncAt?.toISOString());

    ok(
      await act('integration.connect', {
        provider: 'mock_marketplace',
        mode: 'sandbox',
        fields: {
          api_key: 'mk_1',
          shop_id: 'shop_1',
          orders: '[]',
          stock_snapshots: JSON.stringify([{ sku: 'SR-EXT', on_hand: 99, as_of: h.clock.now().toISOString(), snapshot_id: 'snap-3' }]),
        },
      }),
    );
    const r = ok(await act('order.sync_now', {}));
    expect(r.stock_adjusted).toBeUndefined();
    expect(await db.stockMovement.count({ where: { productId: serumId, kind: 'sync_adjust' } })).toBe(countBefore);
    expect((await db.product.findUniqueOrThrow({ where: { id: serumId }, select: { stock: true } })).stock).toBe(12);
  });
});
