// TIP-034b §4 (Postgres 16 + Memurai thật): tệp từ điển gợi ý danh mục ticket qua engine 038b — AC7.
// - Xuất (ticket_categories.export) CSV / XLSX: chỉ bộ cấu hình (vị trí + nhãn), không nhãn lấy từ ticket; nhãn bắt đầu bằng = + - @ không
//   thành công thức (CSV có `'`, XLSX ô chuỗi) và nhập lại ra đúng chuỗi (khứ hồi).
// - Nhập = thay CẢ bộ bằng MỘT ticket_categories.replace: thẻ xác nhận risk config có trước / sau; một dòng lỗi (trùng / quá dài / vị trí sai /
//   > 100) chặn cả tệp (không only_valid); cấu hình đổi sau khi lập kế hoạch → 409, không tự áp; quyền settings.manage (không thay bằng ticket.view).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { DEFAULT_CATEGORY_LABELS } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const TAG = uuidv7().slice(-6);

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function upload(name: string, body: Buffer | string, mime = 'text/csv', token = h.tokenFor(h.user)) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...bearer(token) }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

async function download(url: string, token = h.tokenFor(h.user)) {
  const r = await fetch(`${h.base}${url}`, { headers: { 'x-workspace-id': h.ws, ...bearer(token) } });
  expect(r.status).toBe(200);
  return Buffer.from(await r.arrayBuffer());
}

/** transfer.commit: xem trước (bulk) → xác nhận cùng khoá. */
async function commit(plan: { id: string; version: number }) {
  const key = uuidv7();
  const input = { plan_id: plan.id, if_version: plan.version };
  const p = await json(await call(h, '/actions/transfer.commit', { input }, { 'idempotency-key': key }));
  if (p.status !== 202) return { preview: null, res: p };
  const res = await json(await call(h, '/actions/transfer.commit', { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': key }));
  return { preview: p.body.data.preview, res };
}

const config = async () => (await json(await call(h, '/settings/ticket-categories'))).body.data as { version: number; labels: string[] };
const plan = async (fileId: string, headers: Record<string, string> = {}) => act('transfer.plan', { entity: 'ticket_category_suggestions', file_id: fileId }, headers);

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Nhãn dùng trong ticket — KHÔNG được ra tệp xuất cấu hình.
  const db = await tenant();
  const now = h.clock.now();
  await db.ticket.create({ data: { id: uuidv7(), code: `TK-${TAG}`, title: 'x', category: `Nhãn ticket ${TAG}`, frtDueAt: now, ttrStartAt: now, ttrDueAt: now, createdById: h.user } });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC7 — xuất / nhập tệp danh mục', () => {
  it('xuất bản ảo version 0 = 8 dòng thật; CSV không nhãn ticket; năng lực theo settings.manage', async () => {
    const r = await act('ticket_categories.export', { format: 'csv' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 8, download_url: expect.stringContaining('/download') });
    const text = (await download(r.body.data.result.download_url)).toString('utf8').replace(/^﻿/, '');
    const lines = text.trim().split(/\r\n/);
    expect(lines).toHaveLength(9);
    expect(lines.slice(1).map((l) => l.split(',').slice(1).join(','))).toEqual([...DEFAULT_CATEGORY_LABELS]);
    expect(text).not.toContain(`Nhãn ticket ${TAG}`);
    const caps = (await json(await call(h, '/data-transfer/capabilities'))).body.data;
    expect(caps.find((c: { entity: string }) => c.entity === 'ticket_category_suggestions').import.supported).toBe(true);
    const cs = await h.member('cs');
    const csCaps = (await json(await call(h, '/data-transfer/capabilities', undefined, bearer(cs.token)))).body.data;
    expect(csCaps.find((c: { entity: string }) => c.entity === 'ticket_category_suggestions')).toMatchObject({ import: { supported: false, reason: 'forbidden' }, export: { supported: false } });
    expect((await act('ticket_categories.export', {}, bearer(cs.token))).status).toBe(403);
    expect((await plan(await upload(`cs-${TAG}.csv`, 'Danh mục\nA\n', 'text/csv', cs.token), bearer(cs.token))).status).toBe(403);
  });

  it('CSV có vị trí: plan → thẻ xác nhận config (trước / sau) → MỘT replace; ticket cũ giữ nhãn; hoàn tác theo action', async () => {
    const before = await config();
    const csv = ['Vị trí,Danh mục', '2,Giao hàng', '1,  Hoàn tiền  ', `3,=SUM(A1) ${TAG}`].join('\n');
    const p = await plan(await upload(`cat-${TAG}.csv`, csv));
    expect(p.status, JSON.stringify(p.body)).toBe(200);
    expect(p.body.data.result).toMatchObject({ mapping: { position: 'Vị trí', label: 'Danh mục' }, counts: { total: 3, valid: 3, invalid: 0 } });
    const { preview, res } = await commit(p.body.data.result);
    expect(preview).toMatchObject({ risk: 'config', count: 3, warnings: ['existing_tickets_unchanged'] });
    expect(preview.changes[0].before.labels).toEqual(before.labels);
    expect(preview.changes[0].after).toMatchObject({ labels: ['Hoàn tiền', 'Giao hàng', `=SUM(A1) ${TAG}`], default: 'Hoàn tiền' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    // ≤ ngưỡng: ghi ngay sau commit (afterCommit) — action trả `committing`, kế hoạch đọc lại đã xong.
    expect(res.body.data.result).toMatchObject({ status: 'committing', job_id: null });
    const done = (await json(await call(h, `/data-transfer/plans/${p.body.data.result.id}`))).body.data;
    expect(done).toMatchObject({ status: 'completed', counts: { applied: 3, failed: 0 } });
    const after = await config();
    expect(after).toMatchObject({ version: before.version + 1, labels: ['Hoàn tiền', 'Giao hàng', `=SUM(A1) ${TAG}`] });
    const db = await tenant();
    const rows = await db.transferRow.findMany({ where: { planId: p.body.data.result.id } });
    // Một lệnh duy nhất: mọi dòng trỏ cùng action_log của replace.
    expect(new Set(rows.map((r) => r.resultId)).size).toBe(1);
    const log = await db.actionLog.findUniqueOrThrow({ where: { id: rows[0]!.resultId! } });
    expect(log).toMatchObject({ actionId: 'ticket_categories.replace', source: 'system', onBehalfOfUserId: h.user });
    expect(await db.ticket.count({ where: { category: `Nhãn ticket ${TAG}` } })).toBe(1);
  });

  it('khứ hồi: xuất CSV + XLSX → nhập lại đúng chuỗi (công thức là chữ, không bị thực thi)', async () => {
    const cur = await config();
    const csv = await act('ticket_categories.export', { format: 'csv' });
    const csvBody = await download(csv.body.data.result.download_url);
    expect(csvBody.toString('utf8')).toContain(`'=SUM(A1) ${TAG}`);
    const xlsx = await act('ticket_categories.export', { format: 'xlsx' });
    const xBody = await download(xlsx.body.data.result.download_url);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xBody as unknown as ArrayBuffer);
    const cell = wb.worksheets[0]!.getRow(4).getCell(2);
    expect(cell.formula).toBeUndefined();
    expect(cell.value).toBe(`=SUM(A1) ${TAG}`);
    for (const [name, body, mime] of [[`rt-${TAG}.csv`, csvBody, 'text/csv'], [`rt-${TAG}.xlsx`, xBody, XLSX]] as const) {
      const p = await plan(await upload(name, body, mime));
      expect(p.status, JSON.stringify(p.body)).toBe(200);
      expect(p.body.data.result.counts).toMatchObject({ total: cur.labels.length, valid: cur.labels.length, invalid: 0 });
      const rows = (await json(await call(h, `/data-transfer/plans/${p.body.data.result.id}/rows`))).body.data as { data: { label: string } }[];
      expect(rows.map((r) => r.data.label)).toEqual(cur.labels);
      expect((await act('transfer.cancel', { plan_id: p.body.data.result.id })).status).toBe(200);
    }
  });

  it('một dòng lỗi chặn cả tệp (không only_valid); vị trí trùng / ngoài 1..N; > 100 nhãn không cắt ngầm', async () => {
    const bad = await plan(await upload(`bad-${TAG}.csv`, ['Danh mục', 'A', 'a', 'x'.repeat(61), 'B'].join('\n')));
    const r = bad.body.data.result;
    expect(r.counts).toMatchObject({ total: 4, valid: 2, invalid: 2 });
    const rows = (await json(await call(h, `/data-transfer/plans/${r.id}/rows?check=invalid`))).body.data as { row_no: number; errors: Record<string, string> }[];
    expect(rows.map((x) => [x.row_no, x.errors.label])).toEqual([[2, 'duplicate'], [3, 'too_long']]);
    expect((await commit(r)).res.body.error).toMatchObject({ code: 'INVALID_STATE', fields: { rows: 'has_invalid' } });
    const pol = await act('transfer.update_mapping', { plan_id: r.id, if_version: r.version, row_policy: 'only_valid' });
    expect((await commit(pol.body.data.result)).res.body.error.fields).toEqual({ rows: 'has_invalid' });

    const pos = await plan(await upload(`pos-${TAG}.csv`, ['Vị trí,Danh mục', '1,A', '1,B', '5,C'].join('\n')));
    const pr = (await json(await call(h, `/data-transfer/plans/${pos.body.data.result.id}/rows?check=invalid`))).body.data as { errors: Record<string, string> }[];
    expect(pr.map((x) => x.errors.position)).toEqual(['duplicate', 'out_of_range']);

    const many = await plan(await upload(`many-${TAG}.csv`, ['Danh mục', ...Array.from({ length: 101 }, (_, i) => `N${i}`)].join('\n')));
    expect(many.body.data.result.counts).toMatchObject({ total: 101, valid: 100, invalid: 1 });
    expect((await commit(many.body.data.result)).res.status).toBe(409);
  });

  it('cấu hình đổi (tay) sau khi lập kế hoạch → xác nhận 409, không ghi đè; lập lại mới được', async () => {
    const cur = await config();
    const p = (await plan(await upload(`race-${TAG}.csv`, 'Danh mục\nTừ tệp\n'))).body.data.result;
    expect((await act('ticket_categories.replace', { labels: ['Tay sửa'], if_version: cur.version })).status).toBe(200);
    const key = uuidv7();
    const pv = await json(await call(h, '/actions/transfer.commit', { input: { plan_id: p.id, if_version: p.version } }, { 'idempotency-key': key }));
    expect(pv.body.error).toMatchObject({ code: 'STALE_VERSION' });
    expect((await config()).labels).toEqual(['Tay sửa']);
    const again = (await plan(await upload(`race2-${TAG}.csv`, 'Danh mục\nTừ tệp\n'))).body.data.result;
    expect((await commit(again)).res.status).toBe(200);
    expect((await config()).labels).toEqual(['Từ tệp']);
  });
});
