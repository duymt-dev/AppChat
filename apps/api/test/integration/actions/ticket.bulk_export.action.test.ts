// Ma trận ticket.bulk_export (TIP-034c §4.4, tập 038b `ticket_bulk_results` chỉ xuất): happy (CSV thật — số dòng = số id đã chuẩn hoá,
// cột id / kết quả / mã / đã đổi / hoàn tác, không tiêu đề ticket, ô chữ chống công thức) · 403 kế toán · người khác / log lạ → 404 · nguồn
// assistant xem trước rồi xác nhận · ticket ra ngoài phạm vi sau khi xuất → dấu xuất xứ khác → tệp cũ 410 · nhập tệp kết quả bị từ chối
// (export_only) · idempotency. Undo / bulk / trạng thái: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { call } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let logId: string;
let ids: string[];
const TITLE = '=HYPERLINK("x") bí mật';
const fetchFile = (url: string, who?: { id: string }) =>
  fetch(`${m.h.base}${url}`, { headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${who ? m.h.tokenFor(who.id) : m.h.token}` } });

beforeAll(async () => {
  m = await matrix('ticket.bulk_export');
  const a = await m.seed('ticket.create', { title: TITLE, channel: 'email', category: 'Refund', priority: 'medium' });
  const b = await m.seed('ticket.create', { title: 'Đổi lịch', channel: 'email', category: 'Refund', priority: 'high' });
  ids = [a.ticket_id, b.ticket_id];
  const key = uuidv7();
  const input = { ticket_ids: [...ids, '0190f000-0000-7000-8000-00000000dead'], priority: 'high' };
  const post = (body: unknown) => call(m.h, '/actions/ticket.bulk_update', body, { 'idempotency-key': key }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
  const p = await post({ input });
  const done = await post({ input, confirm_token: p.body.data.confirm_token });
  expect(done.status, JSON.stringify(done.body)).toBe(200);
  logId = done.body.data.action_log_id;
}, 120_000);
afterAll(() => m?.close());

describe('ticket.bulk_export', () => {
  it('happy: CSV thật — mỗi id một dòng, không tiêu đề ticket, ô chống công thức; nhập lại bị từ chối', async () => {
    const r = await m.act({ parent_action_log_id: logId, format: 'csv' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 3, file_name: expect.stringMatching(/\.csv$/), download_url: expect.stringContaining('/download') });
    const res = await fetchFile(r.body.data.result.download_url);
    expect(res.status).toBe(200);
    const text = (await res.text()).replace(/^﻿/, '');
    const lines = text.trim().split('\r\n');
    expect(lines[1]).toBe('Ticket ID,Kết quả,Mã lỗi,Đã đổi,Hoàn tác');
    expect(lines.slice(2)).toEqual([`${ids[0]},ok,,yes,eligible`, `${ids[1]},ok,,no,`, '0190f000-0000-7000-8000-00000000dead,failed,NOT_FOUND,,']);
    expect(text).not.toContain('HYPERLINK');
    const job = await (await m.db()).dataJob.findUniqueOrThrow({ where: { id: r.body.data.result.job_id } });
    expect(job).toMatchObject({ kind: 'ticket.bulk_export', status: 'completed', total: 3 });
    // Tập chỉ xuất: nhập tệp kết quả không phải đường sửa ticket.
    const plan = await call(m.h, '/actions/transfer.plan', { input: { entity: 'ticket_bulk_results', file_id: uuidv7() } }, { 'idempotency-key': uuidv7() }).then((x) => x.json() as Promise<any>); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(plan.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { dataset: 'export_only' } });
  });

  it('403 kế toán · người khác / log lạ / log không phải hàng loạt → 404', async () => {
    expect((await m.act({ parent_action_log_id: logId }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ parent_action_log_id: logId }, m.sales)).status).toBe(404);
    expect((await m.act({ parent_action_log_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ parent_action_log_id: 'khong-phai-uuid' })).status).toBe(404);
  });

  it('nguồn assistant: xem trước (số id) rồi xác nhận', async () => {
    const { preview, done } = await m.confirm({ parent_action_log_id: logId, format: 'xlsx' });
    expect(preview).toMatchObject({ count: 3 });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('kết quả / phạm vi đổi sau khi xuất → dấu xuất xứ khác → tệp cũ 410, không link', async () => {
    const r = await m.act({ parent_action_log_id: logId, format: 'csv' });
    const job = r.body.data.result.job_id as string;
    expect((await fetchFile(r.body.data.result.download_url)).status).toBe(200);
    // Hoàn tác thao tác đi → trạng thái hoàn tác trong tệp đã khác → tệp cũ không phát nữa.
    const u = await call(m.h, '/actions/ticket.bulk_undo', { input: { parent_action_log_id: logId } }, { 'idempotency-key': uuidv7() }).then((x) => x.json() as Promise<any>); // eslint-disable-line @typescript-eslint/no-explicit-any
    const ok = await call(m.h, '/actions/ticket.bulk_undo', { input: { parent_action_log_id: logId }, confirm_token: u.data.confirm_token }, { 'idempotency-key': uuidv7() });
    expect(ok.status).toBe(200);
    expect((await fetchFile(`/v1/data-jobs/${job}/download`)).status).toBe(410);
    expect(((await call(m.h, `/data-jobs/${job}`).then((x) => x.json())) as { data: { download_url: string | null } }).data.download_url).toBeNull();
  });

  it('idempotency: cùng khoá → cùng việc; ô không áp dụng có lý do', async () => {
    const key = uuidv7();
    const a = await m.actWithKey(key, { parent_action_log_id: logId, format: 'csv' });
    const b = await m.actWithKey(key, { parent_action_log_id: logId, format: 'csv' });
    expect(b.body.data.result.job_id).toBe(a.body.data.result.job_id);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
