// TIP-015f §3.4–§3.7 trên Postgres thật, kết nối mock_marketplace: đơn MỚI của người mua mà khách gốc đã xoá → một biên nhận chặn riêng
// tư (không đơn / khách, không đếm imported), sync_now báo blocked riêng; giao lại cùng bản → một biên nhận; mốc mới hơn thay payload; cũ hơn
// bỏ qua; cùng mốc khác hash → conflict. Đơn hỏng (tiền số thực) → failed, sự kiện webhook chưa xử lý xong (thử lại). Khôi phục khách rồi
// sync_now → nhập đúng một đơn từ payload mới nhất, biên nhận thành imported; sync lại không nhân đơn.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { mockOrderSignature, type ExternalOrder } from '@appchat/integrations';
import { OrderSyncService, orderSyncConsumer, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let conn: string;
let lan: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (r.status !== 200) throw new Error(`${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ext = (id: string, updated: string, extra: Partial<ExternalOrder> = {}): ExternalOrder => ({
  external_id: id, platform: 'shopee', platform_status: 'READY_TO_SHIP', buyer: { id: 'buyer-lan', name: 'Lan ***01' },
  lines: [{ sku: 'X-1', name: 'Serum', qty: 1, unit_price: '500000' }], total: '500000', paid: false, created_at: updated, updated_at: updated, ...extra,
});

/** Webhook mock → sự kiện đã lưu → consumer order_sync. Trả id sự kiện. */
async function webhook(evtId: string, orders: unknown[]): Promise<string> {
  const body = JSON.stringify({ id: evtId, orders });
  const r = await fetch(`${h.base}/hooks/integrations/mock_marketplace/${conn}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': mockOrderSignature('mk_b', body) }, body });
  expect(r.status).toBe(200);
  const db = await tenant();
  const ev = await db.integrationEvent.findFirstOrThrow({ where: { connectionId: conn, externalEventId: evtId } });
  await orderSyncConsumer(h.app.get(OrderSyncService, { strict: false })).handle({ id: uuidv7(), topic: 'integration.event_received', workspaceId: h.ws, traceId: null, payload: { connection_id: conn, port: 'order_sync', event_id: ev.id } }, db);
  return ev.id;
}
const receipt = async () => (await tenant()).blockedExternalOrder.findUnique({ where: { connectionId_externalId: { connectionId: conn, externalId: 'SHP-B1' } } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  const at = h.clock.now().toISOString();
  // Đơn đầu tạo khách theo buyer; rồi xoá khách (đơn đã hoàn tất không chặn xoá).
  conn = ok(await act('integration.connect', { provider: 'mock_marketplace', fields: { api_key: 'mk_b', shop_id: 's1', orders: JSON.stringify([ext('SHP-B0', at, { platform_status: 'COMPLETED', paid: true })]) } })).result.connection_id;
  expect(ok(await act('order.sync_now', {})).result).toMatchObject({ imported: 1, blocked: 0, failed: 0 });
  const db = await tenant();
  lan = (await db.contactIdentity.findFirstOrThrow({ where: { channelType: 'marketplace', externalId: 'buyer-lan' } })).contactId;
  const del = await act('contact.delete', { contact_id: lan });
  expect(del.status, JSON.stringify(del.body)).toBe(200);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('đơn sàn của người mua đã xoá', () => {
  it('đơn mới → biên nhận chặn, không đơn / khách; giao lại cùng bản → một biên nhận; sự kiện xử lý xong', async () => {
    const db = await tenant();
    const before = { orders: await db.order.count(), contacts: await db.contact.count() };
    h.clock.advance(60_000);
    const t1 = h.clock.now().toISOString();
    const e1 = await webhook('evt-b1', [ext('SHP-B1', t1)]);
    await webhook('evt-b1b', [ext('SHP-B1', t1)]);
    expect({ orders: await db.order.count(), contacts: await db.contact.count() }).toEqual(before);
    expect(await db.blockedExternalOrder.count({ where: { connectionId: conn } })).toBe(1);
    expect(await receipt()).toMatchObject({ state: 'pending', reason: 'contact_deleted', contactRef: lan, sourceEventId: e1 });
    expect((await db.integrationEvent.findUniqueOrThrow({ where: { id: e1 } })).processedAt).not.toBeNull();
  });

  it('mốc mới hơn thay payload; cũ hơn bỏ qua; cùng mốc khác hash → conflict', async () => {
    const r0 = (await receipt())!;
    h.clock.advance(60_000);
    const t2 = h.clock.now().toISOString();
    await webhook('evt-b2', [ext('SHP-B1', t2, { total: '450000', lines: [{ sku: 'X-1', name: 'Serum', qty: 1, unit_price: '450000' }] })]);
    const r1 = (await receipt())!;
    expect(r1.providerUpdatedAt.getTime()).toBeGreaterThan(r0.providerUpdatedAt.getTime());
    expect((r1.payload as { total: string }).total).toBe('450000');
    await webhook('evt-b3', [ext('SHP-B1', r0.providerUpdatedAt.toISOString())]);
    expect((((await receipt())!).payload as { total: string }).total).toBe('450000');
    await webhook('evt-b4', [ext('SHP-B1', t2, { total: '999000' })]);
    expect((await receipt())!.state).toBe('conflict');
    // Bản làm mới đã kiểm (mốc mới hơn) gỡ xung đột.
    h.clock.advance(60_000);
    await webhook('evt-b5', [ext('SHP-B1', h.clock.now().toISOString(), { total: '450000', lines: [{ sku: 'X-1', name: 'Serum', qty: 1, unit_price: '450000' }] })]);
    expect((await receipt())!.state).toBe('pending');
  });

  it('đơn hỏng → failed, không biên nhận / đơn; sự kiện chưa xử lý xong (thử lại)', async () => {
    const db = await tenant();
    const e = await webhook('evt-bad', [{ ...ext('SHP-BAD', h.clock.now().toISOString()), total: '1.5' }]);
    expect(await db.blockedExternalOrder.count({ where: { externalId: 'SHP-BAD' } })).toBe(0);
    expect(await db.order.count({ where: { externalId: 'SHP-BAD' } })).toBe(0);
    expect((await db.integrationEvent.findUniqueOrThrow({ where: { id: e } })).processedAt).toBeNull();
  });

  it('khôi phục rồi sync_now → nhập đúng một đơn từ payload mới nhất; biên nhận imported; sync lại không nhân', async () => {
    const db = await tenant();
    expect(ok(await act('contact.restore', { contact_id: lan })).result.contact_id).toBe(lan);
    const r = ok(await act('order.sync_now', {})).result;
    expect(r.imported).toBe(1);
    const o = await db.order.findFirstOrThrow({ where: { externalConnectionId: conn, externalId: 'SHP-B1' } });
    expect(o.total).toBe(450000n);
    expect(o.contactId).toBe(lan);
    expect(await receipt()).toMatchObject({ state: 'imported', orderId: o.id });
    expect(ok(await act('order.sync_now', {})).result.imported).toBe(0);
    expect(await db.order.count({ where: { externalConnectionId: conn, externalId: 'SHP-B1' } })).toBe(1);
  });
});
