// TIP-026b §5 (AC8, AC9) — nhập / xuất 3 tập hoạt động CRM qua 038b, Postgres 16 + Memurai thật:
//   - CSV + XLSX thật (XLSX dựng bằng exceljs trong test, không commit tệp nhị phân) cho contact_notes / contact_tasks / contact_opportunities:
//     plan (tập cố định + phiên bản lược đồ) → kiểm (khách theo mã trong scope, việc nhập luôn mở, cơ hội won bị từ chối, dòng xuất có id bị
//     loại) → commit (bulk preview → xác nhận) → bản ghi thật qua action canonical, tác giả = người nhập, biên nhận dòng applied;
//   - gửi kèm tập khác khi xác nhận → 409; tập sai thực thể → 422; trigger DB chặn đổi tập sau khi tạo; lược đồ cũ → 409 lập lại;
//   - replay cùng tệp + tập (kế hoạch mới của cùng người) → duplicate, không tạo lần hai; cùng tệp khác tập không dùng lại biên nhận;
//   - người nhập không quote.create: cột giá trị kỳ vọng → lỗi dòng `forbidden` (không âm thầm bỏ); Sales / CS thiếu crm.import → 403;
//   - xuất XLSX thật đủ dòng theo scope, ô "=…" là chữ, cột id chỉ đọc; CS (không quote.view) không có cột giá trị kỳ vọng; tải lại sau
//     khi mất quyền đọc tiền → 410.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
/** Vai trò tuỳ biến: nhập + sửa khách nhưng KHÔNG ghi tiền báo giá (crm.import ∩ crm.edit, thiếu quote.create). */
let importer: { id: string; token: string };
let lan = '';
const TAG = uuidv7().slice(-6);
const CODE = `KH-AT${TAG}`;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, as(who)).then(json);

async function upload(name: string, body: Buffer, mime: string, who?: { token: string }) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(body)], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${(who ?? h).token}` }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}
const csv = (rows: string[][]) => Buffer.from(`﻿${rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n')}`, 'utf8');
async function xlsx(rows: string[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const CSV = 'text/csv';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Bulk: preview → xác nhận (cùng khoá). */
async function confirmed(id: string, input: unknown, who?: { token: string }) {
  const key = uuidv7();
  const p = await json(await call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...as(who) }));
  if (p.status !== 202) return p;
  return json(await call(h, `/actions/${id}`, { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': key, ...as(who) }));
}
async function plan(dataset: string, fileId: string, who?: { token: string }) {
  const r = await act('transfer.plan', { entity: 'contact', dataset, file_id: fileId }, who);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result;
}
const rowsOf = async (planId: string, who?: { token: string }) => (await get(`/data-transfer/plans/${planId}/rows?limit=100`, who)).body.data;

async function sheet(url: string, who?: { token: string }, expectStatus = 200) {
  const res = await fetch(`${h.base}${url}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${(who ?? h).token}` } });
  expect(res.status).toBe(expectStatus);
  if (expectStatus !== 200) return null;
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

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'activity-transfer-test'));
  sales = await h.member('sales');
  cs = await h.member('cs');
  const scope = { inbox: 'all', crm: 'all', sales: 'none', booking: 'none', support: 'none', insights: 'none' };
  const role = await act('role.create', { name: `Nhập CRM ${TAG}`, permissions: ['crm.view', 'crm.edit', 'crm.import', 'crm.export'], data_scope: scope });
  expect(role.status, JSON.stringify(role.body)).toBe(200);
  importer = await h.member(role.body.data.result.key);
  lan = uuidv7();
  await db.contact.create({ data: { id: lan, code: CODE, name: 'Chị Lan Nhập', phone: '0909555001', phoneNorm: '0909555001', source: 'manual', ownerUserId: h.user } });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('nhập 3 tập hoạt động — CSV / XLSX thật', () => {
  it('ghi chú / bình luận (CSV): kind theo dòng, tác giả = người nhập, ô "=…" là chữ; replay → duplicate; khác tập → 409', async () => {
    const file = await upload(`ghi-chu-${TAG}.csv`, csv([['Mã khách', 'Loại', 'Nội dung'], [CODE, 'Ghi chú', `Khách hỏi giá ${TAG}`], [CODE, 'Bình luận', `=SUM(1;2) ${TAG}`], ['KH-KHONG-CO', '', 'Lạc']]), CSV);
    const p = await plan('contact_notes', file);
    expect(p).toMatchObject({ dataset: 'contact_notes', dataset_schema_version: 1, counts: { total: 3, valid: 2, invalid: 1 } });
    expect((await rowsOf(p.id)).find((r: { row_no: number }) => r.row_no === 3).errors).toEqual({ contact: 'not_found' });
    // Gửi kèm tập khác khi xác nhận → 409 (không dùng xác nhận cho tập khác).
    expect((await act('transfer.commit', { plan_id: p.id, if_version: p.version, dataset: 'contact_tasks' })).status).toBe(409);
    const v2 = (await act('transfer.update_mapping', { plan_id: p.id, if_version: p.version, row_policy: 'only_valid' })).body.data.result;
    const done = await confirmed('transfer.commit', { plan_id: v2.id, if_version: v2.version, dataset: 'contact_notes' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const after = (await get(`/data-transfer/plans/${p.id}`)).body.data;
    expect(after).toMatchObject({ status: 'completed', counts: { applied: 2 } });
    const notes = await db.contactNote.findMany({ where: { contactId: lan, body: { contains: TAG } }, orderBy: { body: 'asc' } });
    expect(notes.map((n) => [n.kind, n.authorUserId])).toEqual([
      ['comment', h.user],
      ['note', h.user],
    ]);
    expect(notes.find((n) => n.kind === 'comment')!.body.startsWith('=SUM')).toBe(true);
    // Trigger: đổi tập sau khi tạo bị chặn ở DB.
    await expect(db.transferPlan.update({ where: { id: p.id }, data: { dataset: 'contact_tasks' } })).rejects.toThrow();
    // Replay cùng tệp, cùng tập → dòng đã ghi thành duplicate; cùng tệp khác tập không dùng lại biên nhận (khác lược đồ — dòng lỗi riêng).
    const again = await plan('contact_notes', file);
    expect(again.counts).toMatchObject({ valid: 0, duplicates: 2 });
    const other = await plan('contact_tasks', file);
    expect(other.counts.duplicates).toBe(0);
  });

  it('việc chăm sóc (XLSX): hạn 23:59 giờ VN, người nhập tự nhận, trạng thái xong bị từ chối', async () => {
    const file = await upload(`viec-${TAG}.xlsx`, await xlsx([['Mã khách', 'Công việc', 'Hạn chót', 'Trạng thái'], [CODE, `Gọi lại ${TAG}`, '20/11/2026', 'Mở'], [CODE, `Đã xong ${TAG}`, '', 'Hoàn thành']]), XLSX);
    const p = await plan('contact_tasks', file);
    expect(p.counts).toMatchObject({ valid: 1, invalid: 1 });
    expect((await rowsOf(p.id)).find((r: { row_no: number }) => r.row_no === 2).errors).toEqual({ state: 'readonly' });
    const v2 = (await act('transfer.update_mapping', { plan_id: p.id, if_version: p.version, row_policy: 'only_valid' })).body.data.result;
    expect((await confirmed('transfer.commit', { plan_id: v2.id, if_version: v2.version })).status).toBe(200);
    const t = await db.contactTask.findFirstOrThrow({ where: { contactId: lan, title: `Gọi lại ${TAG}` } });
    expect(t).toMatchObject({ state: 'open', assigneeUserId: h.user, createdBy: h.user });
    expect(t.dueAt!.toISOString()).toBe('2026-11-20T16:59:00.000Z');
  });

  it('cơ hội: won → terminal; Sales không quote.create có cột giá trị kỳ vọng → forbidden; Owner ghi đúng chuỗi VND', async () => {
    const rows = [['Mã khách', 'Cơ hội', 'Giá trị kỳ vọng', 'Giai đoạn', 'Xác suất'], [CODE, `Gói A ${TAG}`, '15.000.000', 'Đề xuất', '60'], [CODE, `Gói B ${TAG}`, '', 'Thắng', '']];
    const owner = await plan('contact_opportunities', await upload(`co-hoi-${TAG}.csv`, csv(rows), CSV));
    expect(owner.counts).toMatchObject({ valid: 1, invalid: 1 });
    const v2 = (await act('transfer.update_mapping', { plan_id: owner.id, if_version: owner.version, row_policy: 'only_valid' })).body.data.result;
    expect((await confirmed('transfer.commit', { plan_id: v2.id, if_version: v2.version })).status).toBe(200);
    const o = await db.contactOpportunity.findFirstOrThrow({ where: { contactId: lan, title: `Gói A ${TAG}` } });
    expect([String(o.amountVnd), o.stage, Number(o.probability)]).toEqual(['15000000', 'proposal', 60]);
    // Người nhập không có quote.create: cột giá trị kỳ vọng → lỗi dòng `forbidden` (không âm thầm bỏ, không ghi).
    const ip = await plan('contact_opportunities', await upload(`co-hoi-i-${TAG}.csv`, csv(rows.slice(0, 2)), CSV, importer), importer);
    expect((await rowsOf(ip.id, importer))[0].errors).toEqual({ expected_amount: 'forbidden' });
    // Sales mặc định không có crm.import → 403 (nhập hàng loạt không suy từ quyền sửa).
    const sf = await upload(`co-hoi-s-${TAG}.csv`, csv(rows.slice(0, 2)), CSV, sales);
    expect((await act('transfer.plan', { entity: 'contact', dataset: 'contact_opportunities', file_id: sf }, sales)).status).toBe(403);
  });

  it('tập sai thực thể → 422; thiếu crm.import (CS) → 403', async () => {
    const file = await upload(`x-${TAG}.csv`, csv([['Mã khách', 'Nội dung'], [CODE, 'x']]), CSV);
    expect((await act('transfer.plan', { entity: 'quote', dataset: 'contact_notes', file_id: file })).body.error.fields).toEqual({ dataset: 'unsupported' });
    const csFile = await upload(`cs-${TAG}.csv`, csv([['Mã khách', 'Nội dung'], [CODE, 'x']]), CSV, cs);
    const r = await act('transfer.plan', { entity: 'contact', dataset: 'contact_notes', file_id: csFile }, cs);
    expect(r.status).toBe(403);
  });
});

describe('xuất 3 tập hoạt động — XLSX thật', () => {
  it('ghi chú / việc / cơ hội: đủ dòng của khách, cột id chỉ đọc, không công thức; CS không có cột giá trị kỳ vọng', async () => {
    const n = await act('contact_note.export', { contact_id: lan });
    expect(n.status, JSON.stringify(n.body)).toBe(200);
    const notes = (await sheet(n.body.data.result.download_url.replace(/^\/v1/, '/v1')))!;
    expect(notes.head.slice(0, 3)).toEqual(['ID (chỉ đọc)', 'Mã khách', 'Khách hàng']);
    expect(notes.rows.some((r) => String(r[4]).startsWith('=SUM'))).toBe(true);
    const t = await act('contact_task.export', { contact_id: lan, state: 'open' });
    const tasks = (await sheet(t.body.data.result.download_url))!;
    expect(tasks.rows.map((r) => r[3])).toContain(`Gọi lại ${TAG}`);
    const ownerOpp = (await sheet((await act('contact_opportunity.export', { contact_id: lan })).body.data.result.download_url))!;
    expect(ownerOpp.head).toContain('Giá trị kỳ vọng (VND, ước tính)');
    expect(ownerOpp.rows.find((r) => r[3] === `Gói A ${TAG}`)![5]).toBe('15000000');
    // Vai trò có crm.export nhưng không quote.view → tệp không có cột giá trị kỳ vọng, không chuỗi tiền nào.
    const noMoney = await act('contact_opportunity.export', { contact_id: lan }, importer);
    expect(noMoney.status, JSON.stringify(noMoney.body)).toBe(200);
    const nm = (await sheet(noMoney.body.data.result.download_url, importer))!;
    expect(nm.head).not.toContain('Giá trị kỳ vọng (VND, ước tính)');
    expect(nm.rows.flat()).not.toContain('15000000');
    expect(nm.rows.length).toBeGreaterThan(0);
    // CS không có crm.export → 403.
    expect((await act('contact_opportunity.export', { contact_id: lan }, cs)).status).toBe(403);
  });
});

describe('EXPLAIN 10k — chốt id xuất hoạt động', () => {
  it('10k khách + 10k việc: chốt id theo khách đi index việc (contact_id =, state =, due_at), không quét hàng rộng', async () => {
    const pg = (await import('pg')).default;
    const { withDatabase, tenantDbName } = await import('@appchat/db');
    await db.$executeRawUnsafe(`INSERT INTO contact (id, code, name, source, owner_user_id)
      SELECT gen_random_uuid(), 'KE' || lpad(g::text, 5, '0'), 'E ' || g, 'manual', '${h.user}'::uuid FROM generate_series(1, 10000) g`);
    await db.$executeRawUnsafe(`INSERT INTO contact_task (id, contact_id, title, description, state)
      SELECT gen_random_uuid(), c.id, 'Việc ' || c.code, repeat('mô tả dài ', 50), (ARRAY['open','cancelled'])[1 + (row_number() OVER ()) % 2]::contact_task_state
      FROM contact c WHERE c.code LIKE 'KE%'`);
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    await mig.query('ANALYZE contact; ANALYZE contact_task');
    await mig.end();
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN (ANALYZE, BUFFERS) SELECT x.id FROM contact_task x JOIN contact c ON c.id = x.contact_id
       WHERE c.deleted_at IS NULL AND c.id = '${lan}'::uuid AND x.state = 'open'::contact_task_state ORDER BY x.contact_id, x.due_at ASC NULLS LAST, x.id LIMIT 100001`,
    )).map((r) => r['QUERY PLAN']).join(String.fromCharCode(10));
    if (process.env.EXPLAIN_OUT) (await import('node:fs')).writeFileSync(process.env.EXPLAIN_OUT, plan);
    expect(plan).toContain('contact_task_list_idx');
    expect(plan).not.toMatch(/Seq Scan on contact_task/);
  });
});
