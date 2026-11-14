// TIP-032c AC8 — xuất thật + KPI sau khi đổi người phụ trách, trên Postgres 16 + Memurai thật:
//   - đơn / hợp đồng do Sales tạo, Owner đổi người phụ trách sang Manager → tệp XLSX đọc lại: cột "Người tạo (doanh số)" = Sales,
//     "Người phụ trách hiện tại" = Manager; không có cột id / version / công thức; tệp dựng lại sau mỗi lần đổi phản ánh bản hiện tại
//   - bộ lọc owner_id (người tạo) vs assigned_user_id (người phụ trách) trên action xuất trả đúng tập
//   - KPI sales.booked của Sales (scope own) vẫn tính đơn đã chuyển phụ trách (doanh số theo người tạo); Manager không nhận doanh số đó
//   - Sales mất quan hệ hiện tại với đơn → xuất danh sách không còn dòng đó (scope theo người phụ trách / quan hệ hiện tại)
//   - EXPLAIN: đơn theo người tạo (doanh số) dùng index người tạo có sẵn `order_live_owner_idx` (giữ cho KPI — §Index), không Seq Scan
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { STORAGE, registerListExportKinds, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let manager: { id: string; token: string };
let lan = '';

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const TAG = uuidv7().slice(-6);
const line = { name: 'Serum', qty: 1, unit_price: '700000', tax_rate: 0 };
const CREATOR = 'Người tạo (doanh số)';
const ASSIGNED = 'Người phụ trách hiện tại';

async function sheet(url: string, who?: { token: string }) {
  const res = await fetch(`${h.base}${url}`, { headers: { 'x-workspace-id': h.ws, ...as(who ?? h) } });
  expect(res.status).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.arrayBuffer()) as ArrayBuffer);
  const ws = wb.worksheets[0]!;
  const rows: unknown[][] = [];
  ws.eachRow((r, n) => {
    if (n > 2) rows.push((r.values as unknown[]).slice(1));
    r.eachCell((c) => expect(c.formula).toBeUndefined());
  });
  const head = (ws.getRow(2).values as unknown[]).slice(1).map(String);
  const pair = (i = 0) => [rows[i]?.[head.indexOf(CREATOR)] ?? '', rows[i]?.[head.indexOf(ASSIGNED)] ?? ''];
  return { head, rows, pair };
}

async function exportOne(kind: string, input: Record<string, unknown>, who?: { token: string }) {
  const r = await act(kind, input, who);
  expect(r.status, `${kind} ${JSON.stringify(r.body)}`).toBe(200);
  const rows = r.body.data.result.rows as number;
  return { rows, file: rows ? await sheet(r.body.data.result.download_url, who) : null };
}

async function booked(who: { token: string }) {
  const r = await fetch(`${h.base}/v1/insights/sales.booked?from=2026-01-01&to=2027-01-01&bucket=month`, {
    headers: { 'x-workspace-id': h.ws, ...as(who) },
  });
  const body = (await r.json()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(r.status, JSON.stringify(body)).toBe(200);
  const rows = body.data.rows as { amount: string; count: number }[];
  return { amount: rows.reduce((s, x) => s + BigInt(x.amount), 0n), count: rows.reduce((s, x) => s + x.count, 0) };
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'commerce-export-attribution'));
  sales = await h.member('sales');
  manager = await h.member('manager');
  registerListExportKinds(h.app.get(STORAGE, { strict: false }), h.platform);
  lan = uuidv7();
  await db.contact.create({ data: { id: lan, code: `KH-${TAG}`, name: `Chị Lan ${TAG}`, source: 'manual', ownerUserId: sales.id } });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC8 xuất thật + KPI sau đổi người phụ trách (TIP-032c)', () => {
  it('đơn: tệp đọc lại tách người tạo / người phụ trách; KPI vẫn theo người tạo; scope xuất theo quan hệ hiện tại', async () => {
    const created = await act('order.create', { contact_id: lan, items: [line] }, sales);
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    const id = created.body.data.result.order_id as string;
    const code = (await db.order.findUniqueOrThrow({ where: { id } })).code;
    const kpi0 = await booked(sales);
    const mgr0 = await booked(manager);

    let f = (await exportOne('order.export', { q: code })).file!;
    expect(f.head).toEqual(expect.arrayContaining([CREATOR, ASSIGNED]));
    expect(f.head.some((x) => /version|phiên bản|^id$/i.test(x))).toBe(false);
    expect(f.pair()).toEqual(['sales', 'sales']);

    const v = (await db.order.findUniqueOrThrow({ where: { id } })).version;
    const upd = await act('order.update', { order_id: id, if_version: v, patch: { assigned_user_id: manager.id } });
    expect(upd.status, JSON.stringify(upd.body)).toBe(200);

    f = (await exportOne('order.export', { q: code })).file!;
    expect(f.pair()).toEqual(['sales', 'manager']);
    expect((await exportOne('order.export', { q: code, owner_id: sales.id })).rows).toBe(1);
    expect((await exportOne('order.export', { q: code, assigned_user_id: sales.id })).rows).toBe(0);
    expect((await exportOne('order.export', { q: code, assigned_user_id: manager.id })).rows).toBe(1);

    // KPI doanh số không đổi theo người phụ trách (038 — doanh số theo người tạo).
    expect(kpi0.amount).toBeGreaterThanOrEqual(700_000n);
    expect(await booked(sales)).toEqual(kpi0);
    expect(await booked(manager)).toEqual(mgr0);
    // Sales hết quan hệ hiện tại (không phụ trách đơn, không còn là chủ khách) → mất dòng xuất; KPI doanh số vẫn giữ.
    await db.contact.update({ where: { id: lan }, data: { ownerUserId: h.user } });
    expect((await exportOne('order.export', { q: code }, sales)).rows).toBe(0);
    expect(await booked(sales)).toEqual(kpi0);
    await db.contact.update({ where: { id: lan }, data: { ownerUserId: sales.id } });
  });

  it('hợp đồng: tệp dựng lại sau mỗi lần đổi phản ánh người phụ trách hiện tại, người tạo giữ nguyên; bỏ giao → ô trống', async () => {
    const created = await act('contract.create', { contact_id: lan, kind: 'service', title: `Gói năm ${TAG}`, value: '12000000' }, sales);
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    const id = created.body.data.result.contract_id as string;
    const code = (await db.contract.findUniqueOrThrow({ where: { id } })).code;
    const assign = async (to: string | null) => {
      const v = (await db.contract.findUniqueOrThrow({ where: { id } })).version;
      const r = await act('contract.update', { contract_id: id, if_version: v, patch: { assigned_user_id: to } });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
    };
    const pair = async () => (await exportOne('contract.export', { q: code })).file!.pair();
    expect(await pair()).toEqual(['sales', 'sales']);
    await assign(manager.id);
    expect(await pair()).toEqual(['sales', 'manager']);
    await assign(null);
    expect(await pair()).toEqual(['sales', '']);
    expect((await exportOne('contract.export', { q: code, owner_id: sales.id })).rows).toBe(1);
    expect((await exportOne('contract.export', { q: code, assigned_user_id: manager.id })).rows).toBe(0);
    expect((await db.contract.findUniqueOrThrow({ where: { id } })).ownerUserId).toBe(sales.id);
  });
});

describe('EXPLAIN KPI theo người tạo (index giữ cho doanh số)', () => {
  it('đơn theo người tạo (doanh số) → order_live_owner_idx', async () => {
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${ws.dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT o.id, o.total FROM "order" o WHERE o.deleted_at IS NULL AND o.owner_user_id = $1::uuid AND o.status = 'completed' ORDER BY o.created_at DESC, o.id DESC LIMIT 50`, [sales.id])).rows.map((r) => r['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/order_live_owner_idx/);
      expect(plan).not.toMatch(/Seq Scan/);
    } finally {
      await c.end();
    }
  });
});
