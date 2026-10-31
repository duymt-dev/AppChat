// TIP-031 AC trên Postgres 16 + Memurai: đơn hàng — migration 031 + index (EXPLAIN danh sách / chip), create (DH-001001, cọc → Chờ cọc,
// cọc > tổng 422) + hoàn tác; update tự do ở new, processing chỉ khi chưa thu (+ hoàn tác); set_deposit / update_shipping (+ hoàn tác);
// từ báo giá đã chốt (một báo giá một đơn, quote.order_id) / hợp đồng đã ký (dòng từ báo giá nguồn, nhiều đơn); xác nhận → trừ kho (combo
// theo thành phần, sold) + hoàn tác hoàn kho; hoàn tất → điểm × hạng, khách Đã mua, tổng chi, lần mua cuối, event; huỷ bắt buộc lý do,
// hoàn kho, đã thu → chờ hoàn tiền; ORDER_FLOW (sai trạng thái 409); đơn sàn qua kết nối `mock_marketplace` (sync_now + webhook):
// idempotent, khoá dòng, khách theo buyer, trạng thái sàn đi tiếp, không tích điểm; quyền + scope; D42 + chip + meta.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { mockOrderSignature, type ExternalOrder } from '@appchat/integrations';
import { orderRowSchema, ordersMetaSchema, ordersPageSchema } from '@appchat/shared';
import { OrderSyncService, orderSyncConsumer, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
let accountant: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  [sales, cs, accountant] = [await h.member('sales'), await h.member('cs'), await h.member('accountant')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const row = async (id: string, who?: { id: string }) => orderRowSchema.parse((await get(`/orders/${id}`, who)).body.data);
const stock = async (id: string) => (await (await tenant()).product.findUniqueOrThrow({ where: { id }, select: { stock: true, sold: true } }));
const line = (name: string, unit_price: string, qty = 1, product_id?: string) => ({ name, qty, unit_price, tax_rate: 0 as const, ...(product_id ? { product_id } : {}) });

const ids = {} as Record<string, string> & { serum: string; mask: string; combo: string; hifu: string; lan: string; vy: string; o1: string; o2: string; o3: string; shp1: string };

async function product(key: string, input: Record<string, unknown>) {
  return (ids[key] = ok(await act('product.create', input)).result.product_id as string);
}

describe('chuẩn bị', () => {
  it('khách + sản phẩm (có tồn, combo theo thành phần, dịch vụ)', async () => {
    ids.lan = ok(await act('contact.create', { full_name: 'Chị Lan', phone: '0909300001' })).result.contact_id;
    ids.vy = ok(await act('contact.create', { full_name: 'Phương Vy', phone: '0909300002' }, sales)).result.contact_id;
    await product('serum', { name: 'Serum B5', type: 'physical', price: '600000', stock: 10, sku: 'SR-B5' });
    await product('mask', { name: 'Mặt nạ', type: 'physical', price: '100000', stock: 20 });
    await product('combo', { name: 'Combo dưỡng', type: 'combo', price: '900000', components: [{ name: 'Serum B5', qty: 1 }, { name: 'Mặt nạ', qty: 2 }] });
    await product('hifu', { name: 'HIFU', type: 'service', price: '12000000' });
    await (await tenant()).contact.update({ where: { id: ids.lan }, data: { tierKey: 'gold' } });
  });
});

describe('migration 031 + tạo / sửa', () => {
  it('bảng + index; EXPLAIN danh sách / chip thanh toán dùng order_live_*', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'order'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['order_live_recent_idx', 'order_live_status_idx', 'order_live_pay_idx', 'order_live_owner_idx', 'order_contact_idx', 'order_quote_id_key', 'order_external_connection_id_external_id_key']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (sql: string) => (await c.query(`EXPLAIN ${sql}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(await plan(`SELECT o.id FROM "order" o WHERE o.deleted_at IS NULL ORDER BY o.created_at DESC, o.id DESC LIMIT 20`)).toMatch(/order_live_recent_idx/);
      expect(await plan(`SELECT o.id FROM "order" o WHERE o.deleted_at IS NULL AND o.status <> 'cancelled' AND o.pay_status = 'paid' ORDER BY o.created_at DESC, o.id DESC LIMIT 20`)).toMatch(/order_live_pay_idx/);
    } finally {
      await c.end();
    }
  });

  it('create: DH-001001, cọc → Chờ cọc, nhật ký + timeline; cọc > tổng → 422; hoàn tác xoá đơn', async () => {
    h.clock.advance(1000);
    const d = ok(await act('order.create', { contact_id: ids.lan, items: [line('Serum B5', '600000', 2, ids.serum), line('HIFU', '12000000', 1, ids.hifu)], deposit_amount: '3000000' }));
    ids.o1 = d.result.order_id;
    expect(d.result.code).toBe('DH-001001');
    const o = await row(ids.o1);
    expect(o).toMatchObject({ status: 'new', pay_status: 'awaiting_deposit', total: '13200000', deposit_required: true, deposit_amount: '3000000', source: 'manual', owner_user_id: h.user, contact_name: 'Chị Lan' });
    expect(o.events.map((e) => e.type)).toEqual(['created', 'deposit_set']);
    expect(o.ai.hint).toContain('3.000.000');
    const tl = await (await tenant()).timelineEvent.count({ where: { contactId: ids.lan, type: 'order' } });
    expect(tl).toBe(1);
    expect((await act('order.create', { contact_id: ids.lan, items: [line('X', '100')], deposit_amount: '200' })).status).toBe(422);
    const tmp = ok(await act('order.create', { contact_id: ids.lan, items: [line('Tạm', '1000')] }));
    expect((await undo(tmp.action_log_id)).status).toBe(200);
    expect(await (await tenant()).order.count({ where: { id: tmp.result.order_id } })).toBe(0);
  });

  it('update ở new + hoàn tác; đổi khách 422; set_deposit tắt cọc → Chưa thanh toán; vận chuyển + hoàn tác', async () => {
    // Tổng mới nhỏ hơn mức cọc đang đặt → 422 (cọc ≤ tổng).
    expect((await act('order.update', { order_id: ids.o1, patch: { items: [line('Serum B5', '600000', 3, ids.serum)] } })).body.error.fields).toEqual({ 'patch.deposit_amount': 'over_total' });
    const u = ok(await act('order.update', { order_id: ids.o1, patch: { items: [line('Serum B5', '600000', 3, ids.serum)], deposit_amount: '1000000', note: 'Giao chiều' } }));
    expect(await row(ids.o1)).toMatchObject({ total: '1800000', note: 'Giao chiều', deposit_amount: '1000000' });
    expect((await undo(u.action_log_id)).status).toBe(200);
    expect(await row(ids.o1)).toMatchObject({ total: '13200000', note: '', deposit_amount: '3000000' });
    expect((await act('order.update', { order_id: ids.o1, patch: { contact_id: ids.vy } })).status).toBe(422);
    const dep = ok(await act('order.set_deposit', { order_id: ids.o1, deposit_amount: '0' }));
    expect(dep.result.pay_status).toBe('unpaid');
    expect((await undo(dep.action_log_id)).status).toBe(200);
    expect((await row(ids.o1)).pay_status).toBe('awaiting_deposit');
    const s = ok(await act('order.update_shipping', { order_id: ids.o1, shipping: { carrier: 'GHN', tracking: 'GHN123' } }));
    expect((await row(ids.o1)).shipping).toMatchObject({ carrier: 'GHN', tracking: 'GHN123', eta: '' });
    expect((await undo(s.action_log_id)).status).toBe(200);
    expect((await row(ids.o1)).shipping.carrier).toBe('');
  });
});

describe('xác nhận → kho; hoàn tất → điểm; huỷ', () => {
  it('confirm: trừ kho theo dòng (combo theo thành phần) + sold; hoàn tác hoàn kho; xác nhận lại', async () => {
    ids.o2 = ok(await act('order.create', { contact_id: ids.lan, items: [line('Combo dưỡng', '900000', 2, ids.combo), line('Serum B5', '600000', 1, ids.serum)] })).result.order_id;
    const c = ok(await act('order.confirm', { order_id: ids.o2 }));
    expect(c.result.status).toBe('processing');
    // Combo ×2 → serum 2 + mặt nạ 4; dòng serum lẻ 1 → serum tổng 3.
    expect(await stock(ids.serum)).toMatchObject({ stock: 7, sold: 1 });
    expect(await stock(ids.mask)).toMatchObject({ stock: 16 });
    expect(await stock(ids.combo)).toMatchObject({ sold: 2 });
    expect((await undo(c.action_log_id)).status).toBe(200);
    expect(await stock(ids.serum)).toMatchObject({ stock: 10, sold: 0 });
    expect(await stock(ids.mask)).toMatchObject({ stock: 20 });
    expect((await row(ids.o2)).status).toBe('new');
    ok(await act('order.confirm', { order_id: ids.o2 }));
    expect(await stock(ids.serum)).toMatchObject({ stock: 7 });
    expect((await act('order.confirm', { order_id: ids.o2 })).status).toBe(409);
  });

  it('processing: sửa dòng khi chưa thu → kho trừ lại theo dòng mới; đã thu → 409', async () => {
    ok(await act('order.update', { order_id: ids.o2, patch: { items: [line('Serum B5', '600000', 1, ids.serum)] } }));
    expect(await stock(ids.serum)).toMatchObject({ stock: 9 });
    expect(await stock(ids.mask)).toMatchObject({ stock: 20 });
    await (await tenant()).order.update({ where: { id: ids.o2 }, data: { paidTotal: 100000n } });
    expect((await act('order.update', { order_id: ids.o2, patch: { items: [line('Serum B5', '600000', 2, ids.serum)] } })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { order_id: 'paid' } });
    // Người phụ trách / ghi chú vẫn sửa được.
    ok(await act('order.update', { order_id: ids.o2, patch: { note: 'ok' } }));
  });

  it('complete: điểm floor(net/10.000) × hạng Vàng 1,5; khách Đã mua + tổng chi + lần mua cuối; event; hoàn tác giữ Đã mua', async () => {
    ids.o3 = ok(await act('order.create', { contact_id: ids.lan, items: [line('HIFU', '12000000', 1, ids.hifu)], header_discount: { kind: 'amount', value: '1000000' } })).result.order_id;
    expect((await act('order.complete', { order_id: ids.o3 })).status).toBe(409);
    ok(await act('order.confirm', { order_id: ids.o3 }));
    h.clock.advance(1000);
    const d = ok(await act('order.complete', { order_id: ids.o3 }));
    expect(d.result).toMatchObject({ status: 'completed', points: 1650 });
    const db = await tenant();
    const c = await db.contact.findUniqueOrThrow({ where: { id: ids.lan } });
    expect(c).toMatchObject({ stage: 'won', totalSpent: 11000000n });
    expect(c.lastOrderAt?.toISOString()).toBe(h.clock.now().toISOString());
    const ev = await db.outboxEvent.findFirst({ where: { topic: 'order.completed' }, orderBy: { createdAt: 'desc' } });
    expect(ev?.payload).toMatchObject({ order_id: ids.o3, points: 1650, net_before_vat: '11000000' });
    expect((await row(ids.o3)).points_earned).toBe(1650);
    expect((await undo(d.action_log_id)).status).toBe(200);
    expect(await db.contact.findUniqueOrThrow({ where: { id: ids.lan } })).toMatchObject({ stage: 'won', totalSpent: 0n });
    expect(await row(ids.o3)).toMatchObject({ status: 'processing', points_earned: 0 });
    ok(await act('order.complete', { order_id: ids.o3 }));
    expect((await act('order.update', { order_id: ids.o3, patch: { note: 'x' } })).status).toBe(409);
    expect((await act('order.cancel', { order_id: ids.o3, reason: 'x' })).status).toBe(409);
    // Vận chuyển vẫn nhập được sau khi hoàn tất.
    ok(await act('order.update_shipping', { order_id: ids.o3, shipping: { tracking: 'LATE1' } }));
  });

  it('cancel: lý do rỗng 422; hoàn kho; đã thu → chờ hoàn tiền + event; không hoàn tác', async () => {
    expect((await act('order.cancel', { order_id: ids.o2, reason: '  ' })).status).toBe(422);
    const d = ok(await act('order.cancel', { order_id: ids.o2, reason: 'Khách đổi ý' }));
    expect(d.result).toMatchObject({ status: 'cancelled', refund_requested: true });
    expect(await stock(ids.serum)).toMatchObject({ stock: 10 });
    const o = await row(ids.o2);
    expect(o).toMatchObject({ status: 'cancelled', cancel_reason: 'Khách đổi ý', refund_pending: true });
    expect(o.events.map((e) => e.type).slice(-2)).toEqual(['cancelled', 'refund_requested']);
    expect((await undo(d.action_log_id)).status).toBe(409);
    expect((await act('order.confirm', { order_id: ids.o2 })).status).toBe(409);
    const plain = ok(await act('order.create', { contact_id: ids.lan, items: [line('Lẻ', '50000')] })).result.order_id;
    expect(ok(await act('order.cancel', { order_id: plain, reason: 'Trùng' })).result.refund_requested).toBe(false);
  });
});

describe('từ báo giá / hợp đồng', () => {
  it('báo giá chưa chốt 409; đã chốt → đơn (dòng + chiết khấu), quote.order_id, gọi lại trả cùng đơn; hoàn tác gỡ liên kết', async () => {
    const q = ok(await act('quote.create', { contact_id: ids.lan, items: [line('Serum B5', '600000', 2, ids.serum)], header_discount: { kind: 'pct', value: 10 } })).result.quote_id;
    expect((await act('order.create_from_quote', { quote_id: q })).status).toBe(409);
    const db = await tenant();
    await db.quote.update({ where: { id: q }, data: { status: 'accepted', sentAt: h.clock.now() } });
    const d = ok(await act('order.create_from_quote', { quote_id: q }));
    const o = await row(d.result.order_id);
    expect(o).toMatchObject({ source: 'quote', quote_id: q, total: '1080000' });
    expect(o.quote_code).toMatch(/^BG-/);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).orderId).toBe(d.result.order_id);
    expect(ok(await act('order.create_from_quote', { quote_id: q })).result.order_id).toBe(d.result.order_id);
    expect((await undo(d.action_log_id)).status).toBe(200);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).orderId).toBeNull();
  });

  it('hợp đồng chưa ký 409; đã ký → nhiều đơn, dòng từ báo giá nguồn hoặc một dòng giá trị hợp đồng', async () => {
    const c = ok(await act('contract.create', { contact_id: ids.lan, kind: 'service', title: 'Gói chăm sóc năm', value: '24000000', start_date: '2026-11-01', end_date: '2027-10-31' })).result.contract_id;
    expect((await act('order.create_from_contract', { contract_id: c })).status).toBe(409);
    // Ký thật đã phủ ở contracts.test.ts — ở đây gắn bản ký giả để thoả CHECK contract_signed_chk.
    const db = await tenant();
    const file = uuidv7();
    await db.file.create({ data: { id: file, storageKey: `t/${file}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'contract', confirmed: true } });
    await db.contract.update({ where: { id: c }, data: { status: 'signed', signedFileId: file, signedSha256: 'a'.repeat(64) } });
    const a = await row(ok(await act('order.create_from_contract', { contract_id: c })).result.order_id);
    expect(a).toMatchObject({ source: 'contract', contract_id: c, total: '24000000', items: [{ name: 'Gói chăm sóc năm', qty: 1 }] });
    expect(a.contract_code).toMatch(/^HĐ-/);
    const b = ok(await act('order.create_from_contract', { contract_id: c })).result.order_id;
    expect(b).not.toBe(a.id);
  });
});

describe('đơn sàn (D31) — kết nối mock_marketplace', () => {
  const ext = (id: string, status: string, paid: boolean, updated: string, extra: Partial<ExternalOrder> = {}): ExternalOrder => ({
    external_id: id,
    platform: 'shopee',
    platform_status: status,
    buyer: { id: 'buyer-7731', name: 'Khách Shopee ***31' },
    lines: [{ sku: 'SR-B5', name: 'Serum phục hồi B5', qty: 1, unit_price: '690000' }],
    total: '690000',
    paid,
    shipping: { carrier: 'SPX Express', tracking: 'SPX1' },
    created_at: updated,
    updated_at: updated,
    ...extra,
  });
  let conn: string;

  it('sync_now: chưa kết nối → 0; kết nối → nhập đơn (khoá dòng, khách theo buyer, trừ kho theo SKU, đã thu); gọi lại idempotent', async () => {
    expect(ok(await act('order.sync_now', {})).result.imported).toBe(0);
    const at = h.clock.now().toISOString();
    const orders = JSON.stringify([ext('SHP-1', 'READY_TO_SHIP', true, at), ext('SHP-2', 'UNPAID', false, at, { buyer: { id: 'buyer-2', name: 'Người mua 2' } })]);
    conn = ok(await act('integration.connect', { provider: 'mock_marketplace', fields: { api_key: 'mk_1', shop_id: 's1', orders } })).result.connection_id;
    expect((await get('/settings/integrations')).body.data.some((c: { key: string }) => c.key === 'mock_marketplace')).toBe(false);
    expect(ok(await act('order.sync_now', {})).result.imported).toBe(2);
    const list = ordersPageSchema.parse((await get('/orders?source=marketplace&page=1&limit=20')).body);
    expect(list.meta.total).toBe(2);
    const o = list.data.find((x) => x.external?.external_id === 'SHP-1')!;
    expect(o).toMatchObject({ source: 'marketplace', locked_lines: true, status: 'processing', pay_status: 'paid', total: '690000', external: { platform: 'shopee', platform_status: 'READY_TO_SHIP' }, contact_name: 'Khách Shopee ***31' });
    expect(o.events.map((e) => e.type)).toEqual(['imported', 'paid', 'confirmed']);
    expect(await stock(ids.serum)).toMatchObject({ stock: 9 });
    ids.shp1 = o.id;
    const db = await tenant();
    expect(await db.contactIdentity.count({ where: { channelType: 'marketplace', externalId: 'buyer-7731' } })).toBe(1);
    h.clock.advance(60_000);
    expect(ok(await act('order.sync_now', {})).result.imported).toBe(0);
    expect(await db.order.count({ where: { source: 'marketplace' } })).toBe(2);
  });

  it('đơn sàn: sửa dòng / cọc 409 (locked_lines), ghi chú được; hoàn tất không tích điểm', async () => {
    expect((await act('order.update', { order_id: ids.shp1, patch: { items: [line('X', '1')] } })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { order_id: 'locked_lines' } });
    expect((await act('order.set_deposit', { order_id: ids.shp1, deposit_amount: '1000' })).status).toBe(409);
    ok(await act('order.update', { order_id: ids.shp1, patch: { note: 'Khách hỏi quà' } }));
    expect(ok(await act('order.complete', { order_id: ids.shp1 })).result.points).toBe(0);
  });

  it('webhook: sàn báo SHP-2 huỷ → đơn huỷ (lý do theo sàn); sự kiện xử lý một lần', async () => {
    const body = JSON.stringify({ id: 'evt-o1', orders: [ext('SHP-2', 'CANCELLED', false, h.clock.now().toISOString(), { buyer: { id: 'buyer-2', name: 'Người mua 2' } })] });
    const r = await fetch(`${h.base}/hooks/integrations/mock_marketplace/${conn}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': mockOrderSignature('mk_1', body) }, body });
    expect(r.status).toBe(200);
    const db = await tenant();
    const ev = await db.integrationEvent.findFirstOrThrow({ where: { connectionId: conn, externalEventId: 'evt-o1' } });
    const sync = h.app.get(OrderSyncService, { strict: false });
    const consumer = orderSyncConsumer(sync);
    const event = { id: uuidv7(), topic: 'integration.event_received', workspaceId: h.ws, traceId: null, payload: { connection_id: conn, port: 'order_sync', event_id: ev.id } };
    await consumer.handle(event, db);
    await consumer.handle(event, db);
    const o = await db.order.findFirstOrThrow({ where: { externalId: 'SHP-2' } });
    expect(o).toMatchObject({ status: 'cancelled', platformStatus: 'CANCELLED', refundPending: false });
    expect(o.cancelReason).toContain('CANCELLED');
    expect((await db.integrationEvent.findUniqueOrThrow({ where: { id: ev.id } })).processedAt).not.toBeNull();
  });
});

describe('đọc + quyền', () => {
  it('D42 page + chip + tìm không dấu; meta chip / KPI / panel AI / thẻ CRM theo đơn', async () => {
    const all = ordersPageSchema.parse((await get('/orders?page=1&limit=3')).body);
    expect(all.data).toHaveLength(3);
    expect(all.next_cursor).toBe('2');
    const cancelled = ordersPageSchema.parse((await get('/orders?chip=cancelled&page=1&limit=20')).body);
    expect(cancelled.data.every((o) => o.status === 'cancelled')).toBe(true);
    const paid = ordersPageSchema.parse((await get('/orders?chip=paid&page=1&limit=20')).body);
    expect(paid.data.every((o) => o.pay_status === 'paid' && o.status !== 'cancelled')).toBe(true);
    expect(ordersPageSchema.parse((await get('/orders?q=goi cham soc&page=1&limit=20')).body).meta.total).toBe(2);
    const m = ordersMetaSchema.parse((await get(`/orders/meta?order_id=${ids.o3}`)).body.data);
    expect(m.counts.all).toBe(all.meta.total);
    expect(m.counts.cancelled).toBe(cancelled.meta.total);
    expect(m.crm).toMatchObject({ ltv: '11000000', tier: 'gold' });
    expect(m.insight).toContain('Chị Lan');
    expect(Object.keys(m.ai_runs).sort()).toEqual(['analyze', 'collect', 'risk', 'upsell']);
  });

  it('scope: sales chỉ thấy đơn mình; cs 403; kế toán đọc hết; sales không sync_now', async () => {
    const mine = ok(await act('order.create', { contact_id: ids.vy, items: [line('Lẻ', '200000')] }, sales)).result.order_id;
    const s = ordersPageSchema.parse((await get('/orders?page=1&limit=50', sales)).body);
    expect(s.data.map((o) => o.id)).toEqual([mine]);
    expect((await get(`/orders/${ids.o3}`, sales)).status).toBe(404);
    expect((await act('order.confirm', { order_id: ids.o3 }, sales)).status).toBe(404);
    expect((await get('/orders', cs)).status).toBe(403);
    expect(ordersPageSchema.parse((await get('/orders?page=1&limit=50', accountant)).body).meta.total).toBeGreaterThan(5);
    expect((await act('order.sync_now', {}, sales)).status).toBe(403);
  });
});
