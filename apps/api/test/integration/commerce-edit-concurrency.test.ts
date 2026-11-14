// TIP-032c (AC3, AC7) — CAS + khoá trên DB native thật:
//   - hai người sửa cùng version (barrier giữ khoá đơn): một thành công, người kia 409 STALE_VERSION, không ghi dở (dòng / kho / ghi chú)
//   - đồng bộ sàn / sổ thu thắng trước → version tăng qua trigger → bản sửa mang version cũ 409
//   - writer đơn chờ khoá khách gốc (thứ tự khách → đơn, như chuyển phụ trách)
//   - hợp đồng: sửa cùng version song song → đúng một thành công; nguồn (đề xuất AI ghi dòng cha) làm version tăng → sửa cũ 409
//   - EXPLAIN: bộ lọc người phụ trách (có / không trạng thái) đi index `*_live_assigned*`
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let lan: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const TAG = uuidv7().slice(-6);
const line = (qty = 1) => ({ name: 'Serum', qty, unit_price: '500000', tax_rate: 0 });
const settle = <T>(p: Promise<T>) => Promise.race([p.then(() => 'done' as const), new Promise<'pending'>((r) => setTimeout(() => r('pending'), 800))]);

async function hold(sql: string, id: string) {
  const c = new pg.Client({ connectionString: withDatabase(env.TENANT_DATABASE_URL!, tenantDbName(h.ws)) });
  await c.connect();
  await c.query('BEGIN');
  await c.query(sql, [id]);
  return { client: c, release: async () => (await c.query('COMMIT'), await c.end()) };
}
async function explain(sql: string, params: unknown[]) {
  const c = new pg.Client({ connectionString: withDatabase(env.TENANT_DATABASE_URL!, tenantDbName(h.ws)) });
  await c.connect();
  try {
    await c.query('SET enable_seqscan = off');
    return ((await c.query(`EXPLAIN ${sql}`, params)).rows as { 'QUERY PLAN': string }[]).map((r) => r['QUERY PLAN']).join('\n');
  } finally {
    await c.end();
  }
}

beforeAll(async () => {
  h = await startApi(process.env.TEST_LOG ? { logSink: process.stderr } : {});
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'commerce-edit-concurrency'));
  lan = (await act('contact.create', { full_name: `Chị Lan ${TAG}`, phone: `09${Date.now().toString().slice(-8)}` })).body.data.result.contact_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('CAS sửa đơn / hợp đồng (TIP-032c)', () => {
  it('hai người sửa cùng version: một thắng, một 409, không ghi dở', async () => {
    const o = (await act('order.create', { contact_id: lan, items: [line()] })).body.data.result.order_id as string;
    const lock = await hold('SELECT 1 FROM "order" WHERE id = $1::uuid FOR UPDATE', o);
    const a = act('order.update', { order_id: o, if_version: 1, patch: { items: [line(2)], note: 'A' } });
    const b = act('order.update', { order_id: o, if_version: 1, patch: { items: [line(5)], note: 'B' } });
    expect(await settle(a)).toBe('pending');
    await lock.release();
    const rs = await Promise.all([a, b]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const lost = rs.find((r) => r.status === 409)!;
    expect(lost.body.error.code).toBe('STALE_VERSION');
    const row = await db.order.findUniqueOrThrow({ where: { id: o } });
    const won = rs.find((r) => r.status === 200)!;
    expect(row.version).toBe(won.body.data.result.version);
    const items = await db.orderItem.findMany({ where: { orderId: o } });
    expect(items).toHaveLength(1);
    const qty = Number(items[0]!.qty);
    expect([2, 5]).toContain(qty);
    expect(row.note).toBe(qty === 2 ? 'A' : 'B');
  });

  it('ghi nền thắng trước (sổ thu / đồng bộ) → version tăng → sửa cũ 409', async () => {
    const o = (await act('order.create', { contact_id: lan, items: [line()] })).body.data.result.order_id as string;
    await db.order.update({ where: { id: o }, data: { platformStatus: 'X', syncedAt: new Date() } });
    const r = await act('order.update', { order_id: o, if_version: 1, patch: { note: 'cũ' } });
    expect(r.body.error).toMatchObject({ code: 'STALE_VERSION', fields: { version: '2' } });
    expect((await act('order.set_deposit', { order_id: o, if_version: 1, deposit_amount: '1000' })).status).toBe(409);
    expect((await act('order.update_shipping', { order_id: o, if_version: 2, shipping: { carrier: 'GHN' } })).status).toBe(200);
  });

  it('writer đơn chờ khoá khách gốc', async () => {
    const o = (await act('order.create', { contact_id: lan, items: [line()] })).body.data.result.order_id as string;
    const lock = await hold('SELECT id FROM contact WHERE id = $1::uuid FOR UPDATE', lan);
    const u = act('order.update', { order_id: o, patch: { note: 'chờ' } });
    expect(await settle(u)).toBe('pending');
    await lock.release();
    expect((await u).status).toBe(200);
  });

  it('hợp đồng: sửa song song cùng version → đúng một; ghi dòng cha khác (nguồn / đề xuất) làm sửa cũ 409', async () => {
    const c = (await act('contract.create', { contact_id: lan, kind: 'service', title: 'Gói', value: '1000000' })).body.data.result.contract_id as string;
    const rs = await Promise.all([act('contract.update', { contract_id: c, if_version: 1, patch: { title: 'A' } }), act('contract.update', { contract_id: c, if_version: 1, patch: { title: 'B' } })]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    await db.contract.update({ where: { id: c }, data: { aiSuggestions: [] } });
    expect((await act('contract.update', { contract_id: c, if_version: 2, patch: { note: 'x' } })).body.error.code).toBe('STALE_VERSION');
    expect((await act('contract.delete', { contract_id: c, if_version: 2 })).status).toBe(409);
  });

  it('EXPLAIN: lọc người phụ trách có / không trạng thái đi index assigned', async () => {
    const u = h.user;
    const withStatus = await explain(`SELECT o.id FROM "order" o WHERE o.deleted_at IS NULL AND o.assigned_user_id = $1::uuid AND o.status = 'new' ORDER BY o.created_at DESC, o.id DESC LIMIT 20`, [u]);
    const statusless = await explain(`SELECT c.id FROM contract c WHERE c.deleted_at IS NULL AND c.assigned_user_id = $1::uuid ORDER BY c.created_at DESC, c.id DESC LIMIT 20`, [u]);
    expect(withStatus).toMatch(/order_live_assigned/);
    expect(statusless).toMatch(/contract_live_assigned/);
    expect(withStatus + statusless).not.toMatch(/Seq Scan/);
  });
});
