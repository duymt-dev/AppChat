// TIP-026 AC1 trên Postgres 16 + Memurai: màn Khách hàng nối http — `tag_defs.id` + lọc `tag_id`, `sort` (recent / name / created /
// value, lạ → 400) + EXPLAIN dùng index partial migration 026, `/contacts/board` (đếm theo bộ lọc + scope, cột "Thất bại" khi có,
// ≤ 50 thẻ / cột), create / update nhận địa chỉ / ngày sinh / giới tính, xuất theo đủ bộ lọc + thứ tự, `/contacts/import-table`
// (CSV / XLSX của chính người nhập), thông báo crm_owner / crm_access (Q-012 → DC-150) tới đúng người.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { contactsBoardSchema, contactsPageSchema, crmStatsSchema, importTableSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let jobs: WorkerHarness;
let resolver: TenantDbResolver;
let salesA: { id: string; token: string };
let salesB: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  [salesA, salesB] = [await h.member('sales'), await h.member('sales')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  jobs = await startWorker(h.platform, { clock: h.clock });
});
afterAll(async () => {
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const names = (r: { body: { data: { full_name: string }[] } }) => r.body.data.map((c) => c.full_name);

async function upload(name: string, body: Buffer | string, mime: string, who?: { token: string }) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([body], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${who ? who.token : h.tokenFor(h.user)}` }, body: form });
  return (await json(r)).body.data as { file_id: string };
}

const made: Record<string, string> = {};
async function mk(name: string, phone: string, extra: Record<string, unknown> = {}, who?: { token: string }) {
  h.clock.advance(1000);
  const r = await act('contact.create', { full_name: name, phone, ...extra }, who);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (made[name] = r.body.data.result.contact_id as string);
}

describe('danh sách: thẻ + sắp xếp', () => {
  beforeAll(async () => {
    await mk('Bình An', '0912000001', { status: 'active' });
    await mk('An Nhiên', '0912000002', { status: 'potential' });
    await mk('Cường Phát', '0912000003', { status: 'active' });
    const db = await tenant();
    await db.contact.update({ where: { id: made['An Nhiên']! }, data: { totalSpent: 5_000_000n } });
    await db.contact.update({ where: { id: made['Bình An']! }, data: { totalSpent: 1_000_000n } });
    expect((await act('contact.tag', { contact_id: made['Cường Phát'], tag: 'VIP 026', op: 'add' })).status).toBe(200);
  });

  it('stats.tag_defs có id; lọc tag_id đúng; id lạ → rỗng', async () => {
    const s = await get('/contacts/stats');
    const stats = crmStatsSchema.parse(s.body.data);
    const vip = stats.tag_defs.find((t) => t.label === 'VIP 026');
    expect(vip?.id).toMatch(/^[0-9a-f-]{36}$/);
    const r = await get(`/contacts?page=1&limit=20&tag_id=${vip!.id}`);
    expect(names(r)).toEqual(['Cường Phát']);
    expect((await get('/contacts?page=1&limit=20&tag_id=khong-phai-uuid')).body.data).toEqual([]);
  });

  it('sort recent / name / created / value ổn định; giá trị lạ → 400; mặc định = recent', async () => {
    const q = (s: string) => get(`/contacts?page=1&limit=20&q=0912000${s ? `&sort=${s}` : ''}`);
    // Cường Phát có tương tác mới nhất (gắn thẻ không đổi last_interaction — tạo sau cùng).
    expect(names(await q(''))).toEqual(['Cường Phát', 'An Nhiên', 'Bình An']);
    expect(names(await q('recent'))).toEqual(['Cường Phát', 'An Nhiên', 'Bình An']);
    expect(names(await q('name'))).toEqual(['An Nhiên', 'Bình An', 'Cường Phát']);
    expect(names(await q('created'))).toEqual(['Cường Phát', 'An Nhiên', 'Bình An']);
    expect(names(await q('value'))).toEqual(['An Nhiên', 'Bình An', 'Cường Phát']);
    contactsPageSchema.parse((await q('name')).body);
    expect((await q('price')).status).toBe(400);
  });

  it('EXPLAIN: sort name / created / value dùng index partial migration 026', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'contact'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['contact_live_name_idx', 'contact_live_created_idx', 'contact_live_spent_idx']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (order: string) => (await c.query(`EXPLAIN SELECT c.id FROM contact c WHERE c.deleted_at IS NULL ORDER BY ${order} LIMIT 20`)).rows.map((r) => r['QUERY PLAN']).join('\n');
      expect(await plan('c.name ASC, c.id ASC')).toMatch(/contact_live_name_idx/);
      expect(await plan('c.created_at DESC, c.id DESC')).toMatch(/contact_live_created_idx/);
      expect(await plan('c.total_spent DESC, c.id DESC')).toMatch(/contact_live_spent_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('kanban /contacts/board', () => {
  it('đếm theo bộ lọc + scope, có cột Thất bại khi có khách, thẻ theo sắp xếp; sales chỉ thấy khách của mình', async () => {
    const lost = await mk('Đã mất', '0912000009');
    expect((await act('contact.set_stage', { contact_id: lost, stage: 'lost' })).status).toBe(200);
    expect((await act('contact.set_stage', { contact_id: made['Bình An'], stage: 'consulting' })).status).toBe(200);
    const r = await get('/contacts/board?q=0912000&sort=name');
    expect(r.status).toBe(200);
    const b = contactsBoardSchema.parse(r.body.data);
    expect(b.limit).toBe(50);
    const col = (k: string) => b.columns.find((c) => c.key === k)!;
    expect(b.columns.map((c) => c.key)).toEqual(['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost']);
    expect(col('lead').rows.map((x) => x.full_name)).toEqual(['An Nhiên', 'Cường Phát']);
    expect(col('lead').total).toBe(2);
    expect(col('consulting')).toMatchObject({ total: 1, rows: [expect.objectContaining({ full_name: 'Bình An' })] });
    expect(col('lost').total).toBe(1);
    // Bộ lọc stage của danh sách không áp cho kanban; lọc khác áp cho cả đếm.
    const f = contactsBoardSchema.parse((await get('/contacts/board?q=0912000&status=active&stage=lead')).body.data);
    expect(f.columns.find((c) => c.key === 'lead')!.total).toBe(1);
    expect(f.columns.find((c) => c.key === 'consulting')!.total).toBe(1);
    // Sales: khách của Owner không hiện; không có khách Thất bại → không có cột.
    await mk('Khách sales A', '0912000010', {}, salesA);
    const s = contactsBoardSchema.parse((await get('/contacts/board', salesA)).body.data);
    expect(s.columns.flatMap((c) => c.rows.map((x) => x.full_name))).toEqual(['Khách sales A']);
    expect(s.columns.some((c) => c.key === 'lost')).toBe(false);
    expect((await get('/contacts/board?sort=x')).status).toBe(400);
  });
});

describe('form + xuất', () => {
  it('create / update nhận địa chỉ, ngày sinh, giới tính; rỗng = xoá; hoàn tác update khôi phục', async () => {
    const id = await mk('Hồ sơ đủ', '0912000020', { address: '12 Lê Lợi', birthday: '1990-05-17', gender: 'female' });
    const db = await tenant();
    expect(await db.contact.findUniqueOrThrow({ where: { id } })).toMatchObject({ address: '12 Lê Lợi', gender: 'female', birthday: new Date('1990-05-17T00:00:00Z') });
    const u = await act('contact.update', { contact_id: id, patch: { address: '', birthday: '', gender: 'other' } });
    expect(u.status, JSON.stringify(u.body)).toBe(200);
    expect(await db.contact.findUniqueOrThrow({ where: { id } })).toMatchObject({ address: null, birthday: null, gender: 'other' });
    expect((await call(h, `/action-logs/${u.body.data.action_log_id}/undo`, {})).status).toBe(200);
    expect(await db.contact.findUniqueOrThrow({ where: { id } })).toMatchObject({ address: '12 Lê Lợi', gender: 'female' });
    expect((await act('contact.update', { contact_id: id, patch: { birthday: '17/05/1990' } })).status).toBe(422);
  });

  it('contact.export theo đủ bộ lọc (status / tag / sort) như danh sách', async () => {
    const vip = crmStatsSchema.parse((await get('/contacts/stats')).body.data).tag_defs.find((t) => t.label === 'VIP 026')!;
    const rows = async (input: Record<string, unknown>) => {
      const r = await act('contact.export', { q: '0912000', ...input });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      return (r.body.data.result.content as string).split('\r\n').slice(1).map((l) => l.split(',')[1]);
    };
    expect(await rows({ status: 'potential' })).toEqual(['An Nhiên']);
    expect(await rows({ tag_id: vip.id })).toEqual(['Cường Phát']);
    expect((await rows({ sort: 'name', stage: 'lead' })).slice(0, 2)).toEqual(['An Nhiên', 'Cường Phát']);
  });
});

describe('nhập: /contacts/import-table', () => {
  it('CSV (chấm phẩy, BOM, ngoặc kép) → cột + dòng; tệp người khác / purpose khác → 404; định dạng lạ → 422; sales không có crm.import → 403', async () => {
    const csv = '﻿Họ tên;Số điện thoại;Email\r\n"Trần ""Bảo""";0938222110;bao@x.vn\r\nLê Chi;0938222111;\r\n';
    const f = await upload('khach.csv', csv, 'text/csv');
    const r = await get(`/contacts/import-table?file_id=${f.file_id}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(importTableSchema.parse(r.body.data)).toEqual({ columns: ['Họ tên', 'Số điện thoại', 'Email'], rows: [['Trần "Bảo"', '0938222110', 'bao@x.vn'], ['Lê Chi', '0938222111', '']], total: 2 });
    const mine = await upload('b.csv', 'a,b\n1,2', 'text/csv', salesA);
    expect((await get(`/contacts/import-table?file_id=${mine.file_id}`)).status).toBe(404);
    const txt = await upload('a.txt', 'x', 'text/plain');
    expect((await get(`/contacts/import-table?file_id=${txt.file_id}`)).body.error).toMatchObject({ fields: { file_id: 'unsupported' } });
    expect((await get(`/contacts/import-table?file_id=${uuidv7()}`)).status).toBe(404);
    expect((await get(`/contacts/import-table?file_id=${mine.file_id}`, salesA)).status).toBe(403);
  });

  it('XLSX sheet đầu (ngày → YYYY-MM-DD, số → chuỗi)', async () => {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Khách');
    ws.addRow(['Tên', 'SĐT', 'Ngày sinh']);
    ws.addRow(['Phạm Duy', 912000099, new Date('1991-02-03T00:00:00Z')]);
    const f = await upload('khach.xlsx', Buffer.from(await wb.xlsx.writeBuffer()), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const r = await get(`/contacts/import-table?file_id=${f.file_id}`);
    expect(r.body.data).toEqual({ columns: ['Tên', 'SĐT', 'Ngày sinh'], rows: [['Phạm Duy', '912000099', '1991-02-03']], total: 1 });
  });
});

describe('thông báo crm (DC-150)', () => {
  it('chuyển phụ trách → crm_owner cho người nhận; xin chia sẻ → crm_access cho người phụ trách; duyệt → crm_access (approved) cho người xin', async () => {
    const id = await mk('Khách chuyển', '0912000030', {}, salesA);
    expect((await act('contact.transfer_owner', { contact_id: id, to_user_id: salesB.id, move: { conversations: true, quotes: false, appointments: false } })).status).toBe(200);
    const db = await tenant();
    expect(await until(async () => (await db.notification.count({ where: { userId: salesB.id, type: 'crm_owner' } })) === 1)).toBe(true);
    const n = await db.notification.findFirstOrThrow({ where: { userId: salesB.id, type: 'crm_owner' } });
    expect(n).toMatchObject({ link: `/customers?c=${id}` });
    expect(n.title).toContain('Khách chuyển');

    const r = await act('contact.request_access', { contact_id: id }, salesA);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(await until(async () => (await db.notification.count({ where: { userId: salesB.id, type: 'crm_access' } })) === 1)).toBe(true);
    expect((await db.notification.findFirstOrThrow({ where: { userId: salesB.id, type: 'crm_access' } })).title).toMatch(/xin cùng phụ trách khách Khách chuyển/);

    expect((await act('contact.decide_access', { request_id: r.body.data.result.request_id, decision: 'approved' }, salesB)).status).toBe(200);
    expect(await until(async () => (await db.notification.count({ where: { userId: salesA.id, type: 'crm_access' } })) === 1)).toBe(true);
    expect((await db.notification.findFirstOrThrow({ where: { userId: salesA.id, type: 'crm_access' } })).title).toMatch(/đã đồng ý cho bạn cùng phụ trách khách Khách chuyển/);
  });
});
