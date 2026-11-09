// TIP-033b P5 (AC7) trên Postgres 16: tập chỉ xuất `customer_packages` qua package.export — tệp THẬT (CSV + XLSX) tải về rồi đọc lại:
// đúng cột / số buổi / còn lại / trạng thái, không tiền, ô bắt đầu "=" không thành công thức; sales own chỉ gói đơn mình phụ trách, CSKH 0
// gói, khách ngoài scope → 404; tệp cũ không tải sau khi mất order.view (dấu quyền); nhập "số dư liệu trình" bị từ chối 422 trước khi đọc tệp
// (xem mẫu / lập kế hoạch) và không ghi gì; năng lực báo import not_available, export package.export.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let cs: { id: string };
let sales: { id: string };
const ids = {} as Record<'lan' | 'other' | 'prod' | 'mine' | 'theirs', string>;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { id: string }): Record<string, string> => (u ? { authorization: `Bearer ${h.tokenFor(u.id)}` } : {});
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const fetchFile = (url: string, who?: { id: string }) =>
  fetch(`${h.base}${url}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${who ? h.tokenFor(who.id) : h.token}` } });

beforeAll(async () => {
  h = await startApi();
  [cs, sales] = [await h.member('cs'), await h.member('sales')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  const ok = (r: { status: number; body: any }) => (expect(r.status, JSON.stringify(r.body)).toBe(200), r.body.data.result); // eslint-disable-line @typescript-eslint/no-explicit-any
  ids.lan = ok(await act('contact.create', { full_name: 'Chị Lan Xuất Gói', phone: '0909710001', owner_user_id: sales.id })).contact_id;
  ids.other = ok(await act('contact.create', { full_name: 'Anh Ngoài', phone: '0909710002' })).contact_id;
  ids.prod = ok(await act('product.create', { name: 'Liệu trình xuất', type: 'package', price: '3000000', sessions: 10, valid_days: 90, tax_rate: 0 })).product_id;
  const db = await tenant();
  const pkg = async (assignee: string | null, name: string, total: number, used: number) => {
    const now = h.clock.now();
    const orderId = uuidv7();
    await db.$executeRaw`INSERT INTO "order" (id, code, contact_id, assigned_user_id, status, pay_status, created_at, updated_at)
      VALUES (${orderId}::uuid, ${`DH-X${Math.floor(Math.random() * 1e9)}`}, ${ids.lan}::uuid, ${assignee}::uuid, 'new', 'paid', ${now}, ${now})`;
    const id = uuidv7();
    await db.customerPackage.create({ data: { id, contactId: ids.lan, productId: ids.prod, orderId, name, totalSessions: total, usedSessions: used, createdAt: now, updatedAt: now } });
    h.clock.advance(1000);
    return id;
  };
  ids.mine = await pkg(sales.id, 'Gói sales', 10, 3);
  ids.theirs = await pkg(null, '=HYPERLINK("x") gói chủ', 5, 5);
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

async function readXlsx(url: string, who?: { id: string }) {
  const res = await fetchFile(url, who);
  expect(res.status).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.arrayBuffer()) as ArrayBuffer);
  const ws = wb.worksheets[0]!;
  const rows: unknown[][] = [];
  ws.eachRow((r, n) => {
    if (n > 2) rows.push((r.values as unknown[]).slice(1));
    r.eachCell((c) => expect(c.formula).toBeUndefined());
  });
  return { head: (ws.getRow(2).values as unknown[]).slice(1) as string[], rows };
}

describe('package.export — tập chỉ xuất customer_packages', () => {
  it('XLSX thật: đúng cột / số buổi / còn lại / trạng thái; không tiền; ô "=" là chữ', async () => {
    const r = await act('package.export', { contact_id: ids.lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 2, file_name: expect.stringMatching(/\.xlsx$/) });
    const f = await readXlsx(r.body.data.result.download_url);
    expect(f.head.slice(0, 7)).toEqual(['ID (chỉ đọc)', 'Khách hàng', 'Tên', 'Tổng buổi', 'Đã dùng', 'Còn lại (chưa dùng — không phải còn đặt được)', 'Trạng thái']);
    expect(f.rows.map((x) => x.slice(2, 7))).toEqual([
      ['=HYPERLINK("x") gói chủ', 5, 5, 0, 'Đang dùng'],
      ['Gói sales', 10, 3, 7, 'Đang dùng'],
    ]);
    expect(JSON.stringify(f)).not.toMatch(/3000000|VND/);
  });

  it('CSV thật: BOM + tiêu đề + chống công thức (\'=…), lọc trạng thái', async () => {
    const r = await act('package.export', { contact_id: ids.lan, format: 'csv' });
    expect(r.body.data.result.file_name).toMatch(/\.csv$/);
    const res = await fetchFile(r.body.data.result.download_url);
    expect(res.headers.get('content-type')).toMatch(/text\/csv/);
    const bytes = Buffer.from(await res.arrayBuffer());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.subarray(3).toString('utf8').trim().split('\r\n');
    expect(lines[1]).toContain('Tổng buổi');
    expect(lines.slice(2).some((l) => l.includes(`"'=HYPERLINK(""x"") gói chủ"`))).toBe(true);
    expect(lines.slice(2).some((l) => l.includes(',Gói sales,10,3,7,'))).toBe(true);
  });

  it('scope: vai trò own có crm.export chỉ thấy gói đơn mình; khách ngoài scope → 404; sales / CSKH hệ thống (không crm.export) → 403; tệp chỉ người tạo tải', async () => {
    expect((await act('package.export', { contact_id: ids.lan }, sales)).status).toBe(403);
    expect((await act('package.export', { contact_id: ids.lan }, cs)).status).toBe(403);
    const key = (await act('role.create', { name: 'Sales xuất gói', permissions: ['crm.view', 'crm.export', 'order.view'], data_scope: { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key;
    const exporter = await h.member(key);
    const db = await tenant();
    await db.contact.update({ where: { id: ids.lan }, data: { ownerUserId: exporter.id } });
    await db.$executeRaw`UPDATE "order" SET assigned_user_id = ${exporter.id}::uuid WHERE id = (SELECT order_id FROM customer_package WHERE id = ${ids.mine}::uuid)`;
    const s = await act('package.export', { contact_id: ids.lan }, exporter);
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    expect(s.body.data.result.rows).toBe(1);
    expect((await readXlsx(s.body.data.result.download_url, exporter)).rows.map((x) => x[0])).toEqual([ids.mine]);
    expect((await act('package.export', { contact_id: ids.other }, exporter)).status).toBe(404);
    expect((await fetchFile(s.body.data.result.download_url, sales)).status).not.toBe(200);
  });

  it('nhập số dư liệu trình bị từ chối 422 dataset export_only trước khi đọc tệp — không kế hoạch nào được tạo', async () => {
    const db = await tenant();
    const before = await db.transferPlan.count();
    for (const id of ['transfer.sample', 'transfer.plan']) {
      const r = await act(id, { entity: 'contact', dataset: 'customer_packages', file_id: '0190f000-0000-7000-8000-00000000f11e' });
      expect(r.status, JSON.stringify(r.body)).toBe(422);
      expect(r.body.error.fields).toEqual({ dataset: 'export_only' });
    }
    expect(await db.transferPlan.count()).toBe(before);
    const caps = (await call(h, '/data-transfer/capabilities', undefined, {}).then(json)).body.data as { dataset: string; import: { supported: boolean; reason: string | null }; export: { action_id: string } }[];
    expect(caps.find((c) => c.dataset === 'customer_packages')).toMatchObject({ import: { supported: false, reason: 'not_available' }, export: { action_id: 'package.export' } });
  });
});
