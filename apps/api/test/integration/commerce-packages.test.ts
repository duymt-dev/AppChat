// TIP-032b P3 AC3 + review độc lập trên Postgres 16 + Memurai: liệu trình khi cọc — sản phẩm `grant_on_deposit` → đơn xác nhận + đã cọc
// sinh gói ngay (không chờ thu đủ); sản phẩm không bật → chỉ sinh khi thu đủ; ảnh chụp trên dòng đơn (đổi danh mục sau khi ghi dòng không
// đổi gói); hai dòng cùng sản phẩm → hai gói; gói cũ (legacy_product) không sinh thêm khi thu tiếp; thu cọc rồi thu đủ không sinh lần 2.
// Nhắc: còn 1 buổi + còn 7 ngày tới hạn → event `package.reminder_due` một lần mỗi (gói, mốc, bản hạn); quét lại không nhân; gia hạn →
// bản hạn mới → nhắc lại theo hạn mới; hoàn tác gia hạn → bản hạn mới nữa (nhắc của bản cũ không chặn hạn khôi phục).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { remindPackages, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const ids = {} as Record<'lan' | 'early' | 'late', string>;
const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const line = (name: string, unit_price: string, product_id: string, qty = 1) => ({ name, qty, unit_price, tax_rate: 0 as const, product_id });
const packagesOf = async (orderId: string) => (await tenant()).customerPackage.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
const reminders = async (packageId: string) => (await tenant()).packageReminder.count({ where: { packageId } });

/** Đơn bật cọc, xác nhận, rồi đề nghị cọc + thu cọc. */
async function depositedOrder(items: ReturnType<typeof line>[], deposit: string) {
  const o = ok(await act('order.create', { contact_id: ids.lan, items, deposit_amount: deposit })).result.order_id as string;
  ok(await act('order.confirm', { order_id: o }));
  const i = ok(await act('invoice.create', { order_id: o, contact_id: ids.lan, kind: 'deposit', amount: deposit })).result.invoice_id;
  ok(await act('invoice.record_payment', { invoice_id: i, amount: deposit, method: 'cash' }));
  return o;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ids.lan = ok(await act('contact.create', { full_name: 'Chị Lan LT', phone: '0909600001' })).result.contact_id;
  ids.early = ok(await act('product.create', { name: 'Liệu trình cọc dùng ngay', type: 'package', price: '6000000', sessions: 6, valid_days: 60, tax_rate: 0, grant_on_deposit: true })).result.product_id;
  ids.late = ok(await act('product.create', { name: 'Liệu trình thu đủ', type: 'package', price: '4000000', sessions: 4, valid_days: 30, tax_rate: 0 })).result.product_id;
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('liệu trình khi cọc', () => {
  it('migration: unique partial theo dòng đơn + legacy, biên nhận nhắc unique (gói, mốc, bản hạn)', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('customer_package', 'package_reminder')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['customer_package_legacy_key', 'customer_package_order_item_key', 'customer_package_remaining_idx', 'package_reminder_key']));
    expect(idx).not.toContain('customer_package_order_id_product_id_key');
  });

  it('grant_on_deposit: cọc → gói sinh ngay; sản phẩm không bật chờ thu đủ; thu đủ không sinh lần 2', async () => {
    const o = await depositedOrder([line('Liệu trình cọc dùng ngay', '6000000', ids.early), line('Liệu trình thu đủ', '4000000', ids.late)], '3000000');
    let pk = await packagesOf(o);
    expect(pk).toHaveLength(1);
    expect(pk[0]).toMatchObject({ productId: ids.early, totalSessions: 6, sourceKind: 'order_item' });
    expect(pk[0]!.orderItemId).toBeTruthy();
    const i = ok(await act('invoice.create', { order_id: o, contact_id: ids.lan, kind: 'full', amount: '7000000' })).result.invoice_id;
    ok(await act('invoice.record_payment', { invoice_id: i, amount: '7000000', method: 'cash' }));
    pk = await packagesOf(o);
    expect(pk.map((p) => p.productId).sort()).toEqual([ids.early, ids.late].sort());
    expect(pk.filter((p) => p.productId === ids.early)).toHaveLength(1);
  });

  it('ảnh chụp dòng đơn: tắt cờ / đổi số buổi ở danh mục sau khi ghi dòng không đổi gói sinh khi cọc', async () => {
    const o = ok(await act('order.create', { contact_id: ids.lan, items: [line('Liệu trình cọc dùng ngay', '6000000', ids.early)], deposit_amount: '2000000' })).result.order_id as string;
    const p = await (await tenant()).product.findUniqueOrThrow({ where: { id: ids.early } });
    ok(await act('product.update', { product_id: ids.early, patch: { sessions: 99, grant_on_deposit: false }, if_version: p.version }));
    ok(await act('order.confirm', { order_id: o }));
    const i = ok(await act('invoice.create', { order_id: o, contact_id: ids.lan, kind: 'deposit', amount: '2000000' })).result.invoice_id;
    ok(await act('invoice.record_payment', { invoice_id: i, amount: '2000000', method: 'cash' }));
    expect((await packagesOf(o)).map((x) => x.totalSessions)).toEqual([6]);
    const v = (await (await tenant()).product.findUniqueOrThrow({ where: { id: ids.early } })).version;
    ok(await act('product.update', { product_id: ids.early, patch: { sessions: 6, grant_on_deposit: true }, if_version: v }));
  });

  it('hai dòng cùng sản phẩm → hai gói (mỗi dòng một gói)', async () => {
    const o = await depositedOrder([line('Liệu trình cọc dùng ngay', '6000000', ids.early), line('Liệu trình cọc dùng ngay', '6000000', ids.early, 2)], '4000000');
    expect((await packagesOf(o)).map((x) => x.totalSessions).sort((a, b) => a - b)).toEqual([6, 12]);
  });

  it('gói cũ legacy_product: thu tiếp không sinh thêm cho sản phẩm đã có gói', async () => {
    const o = await depositedOrder([line('Liệu trình thu đủ', '4000000', ids.late)], '1000000');
    const db = await tenant();
    await db.customerPackage.create({ data: { id: uuidv7(), contactId: ids.lan, productId: ids.late, orderId: o, name: 'Liệu trình thu đủ (cũ)', totalSessions: 4, sourceKind: 'legacy_product', createdAt: h.clock.now(), updatedAt: h.clock.now() } });
    const i = ok(await act('invoice.create', { order_id: o, contact_id: ids.lan, kind: 'full', amount: '3000000' })).result.invoice_id;
    ok(await act('invoice.record_payment', { invoice_id: i, amount: '3000000', method: 'cash' }));
    expect(await packagesOf(o)).toHaveLength(1);
  });
});

describe('nhắc liệu trình', () => {
  it('còn 1 buổi + còn 7 ngày: một nhắc mỗi mốc; quét lại không nhân; gia hạn → nhắc theo hạn mới; hoàn tác tăng bản hạn', async () => {
    const o = await depositedOrder([line('Liệu trình cọc dùng ngay', '6000000', ids.early)], '3000000');
    const db = await tenant();
    const [pk] = await packagesOf(o);
    await db.customerPackage.update({ where: { id: pk!.id }, data: { usedSessions: 5, expiresAt: new Date(h.clock.now().getTime() + 5 * DAY) } });
    await remindPackages(db, h.ws, h.clock.now(), TZ);
    expect(await reminders(pk!.id)).toBe(2);
    await remindPackages(db, h.ws, h.clock.now(), TZ);
    expect(await reminders(pk!.id)).toBe(2);
    const e = ok(await act('package.extend', { package_id: pk!.id, days: 1 }));
    const v1 = (await db.customerPackage.findUniqueOrThrow({ where: { id: pk!.id } })).expiryVersion;
    expect(v1).toBe(pk!.expiryVersion + 1);
    await remindPackages(db, h.ws, h.clock.now(), TZ);
    expect(await reminders(pk!.id)).toBe(3);
    expect((await call(h, `/action-logs/${e.action_log_id}/undo`, {})).status).toBe(200);
    expect((await db.customerPackage.findUniqueOrThrow({ where: { id: pk!.id } })).expiryVersion).toBe(v1 + 1);
    const rows = await db.packageReminder.findMany({ where: { packageId: pk!.id } });
    expect(rows.map((r) => r.milestone).sort()).toEqual(['expiry_t7', 'expiry_t7', 'remaining_1']);
    const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'package.reminder_due', payload: { path: ['milestone'], equals: 'remaining_1' } }, orderBy: { createdAt: 'desc' } });
    expect(ev.payload).toMatchObject({ package_id: pk!.id, contact_id: ids.lan, name: 'Liệu trình cọc dùng ngay', days: null });
  }, 180_000);

  it('gói hạn xa + còn nhiều buổi không nhắc', async () => {
    const o = await depositedOrder([line('Liệu trình cọc dùng ngay', '6000000', ids.early)], '3000000');
    const db = await tenant();
    const [pk] = await packagesOf(o);
    await db.customerPackage.update({ where: { id: pk!.id }, data: { usedSessions: 2, expiresAt: new Date(h.clock.now().getTime() + 40 * DAY) } });
    await remindPackages(db, h.ws, h.clock.now(), TZ);
    expect(await reminders(pk!.id)).toBe(0);
  });
});
