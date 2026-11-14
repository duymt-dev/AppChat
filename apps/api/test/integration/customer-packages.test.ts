// TIP-033b P4 (AC5) trên Postgres 16: PackagesRead dùng chung GET /contacts/:id/packages + action package.list_for_contact + lịch hẹn.
// Khách ngoài scope CRM → 404; CSKH (crm all, sales none) thấy khách nhưng 0 gói; sales own chỉ thấy gói của đơn mình phụ trách; order_id
// chỉ hiện với người có order.view; không số tiền; remaining = max(total − used, 0); cursor trang ổn định (không trùng / sót), cursor của
// khách khác → 409; gói của nguồn đã gộp hiện ở khách gốc đúng một lần; lịch hẹn của người xem không đọc được gói → package = null;
// EXPLAIN trang theo khách dùng index (không seq scan) trên 10k gói.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { customerPackagesPageSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let cs: { id: string };
let sales: { id: string };

beforeAll(async () => {
  h = await startApi();
  [cs, sales] = [await h.member('cs'), await h.member('sales')];
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
  return (r.body as { data: { result: Record<string, any> } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const ids = {} as Record<'lan' | 'other' | 'prod' | 'svc' | 'mine' | 'theirs', string>;

/** Đơn + gói ghi thẳng (fixture SQL — luồng sinh gói đã phủ ở commerce-packages.test). */
async function pkg(contactId: string, assignee: string | null, name: string, total = 10, used = 0) {
  const db = await tenant();
  const now = h.clock.now();
  const orderId = uuidv7();
  await db.$executeRaw`INSERT INTO "order" (id, code, contact_id, assigned_user_id, status, pay_status, created_at, updated_at)
    VALUES (${orderId}::uuid, ${`DH-T${Math.floor(Math.random() * 1e9)}`}, ${contactId}::uuid, ${assignee}::uuid, 'new', 'paid', ${now}, ${now})`;
  const id = uuidv7();
  await db.customerPackage.create({ data: { id, contactId, productId: ids.prod, orderId, name, totalSessions: total, usedSessions: used, createdAt: now, updatedAt: now } });
  h.clock.advance(1000);
  return id;
}

describe('PackagesRead', () => {
  beforeAll(async () => {
    ids.lan = ok(await act('contact.create', { full_name: 'Chị Lan Gói', phone: '0909700001', owner_user_id: sales.id })).result.contact_id;
    ids.other = ok(await act('contact.create', { full_name: 'Anh Khác', phone: '0909700002' })).result.contact_id;
    ids.prod = ok(await act('product.create', { name: 'Liệu trình đọc', type: 'package', price: '3000000', sessions: 10, valid_days: 90, tax_rate: 0 })).result.product_id;
    ids.mine = await pkg(ids.lan, sales.id, 'Gói sales phụ trách', 10, 3);
    ids.theirs = await pkg(ids.lan, null, 'Gói chủ phụ trách', 5, 5);
  });

  it('chủ: hai gói, remaining = max(total − used, 0), có order_id, không số tiền; DTO đúng schema', async () => {
    const r = await get(`/contacts/${ids.lan}/packages`);
    expect(r.status).toBe(200);
    const page = customerPackagesPageSchema.parse(r.body);
    expect(page.data.map((p) => [p.name, p.remaining])).toEqual([['Gói chủ phụ trách', 0], ['Gói sales phụ trách', 7]]);
    expect(page.data.every((p) => p.order_id)).toBe(true);
    expect(JSON.stringify(r.body)).not.toMatch(/price|amount|total_vnd/);
  });

  it('sales own: chỉ gói của đơn mình phụ trách, order_id hiện (có order.view); CSKH: thấy khách, 0 gói; khách ngoài scope → 404', async () => {
    const s = (await get(`/contacts/${ids.lan}/packages`, sales)).body;
    expect(s.data.map((p: { id: string }) => p.id)).toEqual([ids.mine]);
    expect((await get(`/contacts/${ids.lan}/packages`, cs)).body).toEqual({ data: [], next_cursor: null });
    expect((await get(`/contacts/${ids.other}/packages`, sales)).status).toBe(404);
    expect((await act('package.list_for_contact', { contact_id: ids.other }, sales)).status).toBe(404);
  });

  it('cursor: limit 1 → hai trang không trùng; cursor dùng cho khách khác → 409; action cùng kết quả', async () => {
    const p1 = (await get(`/contacts/${ids.lan}/packages?limit=1`)).body;
    expect(p1.data).toHaveLength(1);
    const p2 = (await get(`/contacts/${ids.lan}/packages?limit=1&cursor=${p1.next_cursor}`)).body;
    expect(p2.data).toHaveLength(1);
    expect(p2.data[0].id).not.toBe(p1.data[0].id);
    expect(p2.next_cursor).toBeNull();
    expect((await get(`/contacts/${ids.other}/packages?cursor=${p1.next_cursor}`)).status).toBe(409);
    const a = ok(await act('package.list_for_contact', { contact_id: ids.lan, status: 'active' })).result;
    expect(a.packages.map((p: { id: string }) => p.id)).toEqual([ids.theirs, ids.mine]);
  });

  it('gộp khách: gói của nguồn đã gộp hiện ở khách gốc một lần, giữ contact_id gốc của gói', async () => {
    const src = ok(await act('contact.create', { full_name: 'Lan trùng', phone: '0909700003' })).result.contact_id as string;
    const sp = await pkg(src, null, 'Gói của bản phụ', 4, 1);
    const db = await tenant();
    await db.contact.update({ where: { id: src }, data: { mergedIntoId: ids.lan, deletedAt: h.clock.now() } });
    const list = (await get(`/contacts/${ids.lan}/packages`)).body.data as { id: string; contact_id: string }[];
    expect(list.filter((p) => p.id === sp)).toEqual([expect.objectContaining({ contact_id: src })]);
  });

  it('lịch hẹn: người xem không đọc được gói → package_id / package = null, các trường lịch vẫn có', async () => {
    const svc = ok(await act('product.create', { name: 'Dịch vụ gói', type: 'service', price: '300000', duration_min: 60, tax_rate: 0 })).result.product_id;
    const st = ok(await act('staff.create', { name: 'KTV. Gói' })).result.staff_id;
    ok(await act('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: true, start: '08:00', end: '19:00' })) }));
    const a = ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: svc, staff_id: st, date: '2026-11-02', start: '09:00' })).result;
    const db = await tenant();
    await db.appointment.update({ where: { id: a.appointment_id }, data: { packageId: ids.theirs, ownerUserId: sales.id } });
    expect((await get(`/calendar/${a.appointment_id}`)).body.data).toMatchObject({ package_id: ids.theirs, package: { id: ids.theirs } });
    const seen = (await get(`/calendar/${a.appointment_id}`, sales)).body.data;
    expect(seen).toMatchObject({ id: a.appointment_id, package_id: null, package: null });
  });

  it('EXPLAIN 10k gói: trang theo khách dùng index, không seq scan customer_package', async () => {
    const db = await tenant();
    const now = h.clock.now();
    const orderId = (await db.customerPackage.findUniqueOrThrow({ where: { id: ids.mine } })).orderId;
    await db.$executeRaw`INSERT INTO customer_package (id, contact_id, product_id, order_id, name, total_sessions, used_sessions, status, created_at, updated_at, source_kind, order_item_id)
      SELECT gen_random_uuid(), ${ids.other}::uuid, ${ids.prod}::uuid, ${orderId}::uuid, 'G' || g, 5, 0, 'active', ${now}::timestamptz - (g || ' seconds')::interval, ${now}, 'order_item', gen_random_uuid()
      FROM generate_series(1, 10000) g`;
    await db.$executeRaw`ANALYZE customer_package`;
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      const plan = (await c.query(`EXPLAIN SELECT p.id FROM customer_package p JOIN "order" o ON o.id = p.order_id WHERE p.contact_id = $1 ORDER BY p.created_at DESC, p.id DESC LIMIT 31`, [ids.lan])).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/customer_package_contact_(page_)?idx/);
      expect(plan).not.toMatch(/Seq Scan on customer_package/);
    } finally {
      await c.end();
    }
  });
});
