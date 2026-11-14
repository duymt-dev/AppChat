// Ma trận ticket_categories.export (TIP-034b §4.1): happy (tệp CSV chỉ bộ cấu hình, tải qua data-jobs) · 403 (sales / cs không có
// settings.manage) · scope: cấu hình workspace (không nhãn lấy từ ticket) · agent bị chặn (agentGrantable false) · idempotency (cùng khoá trả
// cùng việc). Undo / bulk / trạng thái: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('ticket_categories.export');
}, 120_000);
afterAll(() => m?.close());

describe('ticket_categories.export', () => {
  it('happy: 8 nhãn mặc định, việc hoàn tất, link tải có hạn', async () => {
    const r = await m.act({ format: 'csv' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 8, file_name: expect.stringMatching(/\.csv$/), download_url: expect.stringContaining('/download'), expires_at: expect.any(String) });
    const job = await (await m.db()).dataJob.findUniqueOrThrow({ where: { id: r.body.data.result.job_id } });
    expect(job).toMatchObject({ kind: 'ticket_categories.export', status: 'completed', total: 8 });
  });

  it('403 sales / cs; agent bị chặn', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
    expect((await m.act({}, m.cs)).status).toBe(403);
    expect((await m.act({}, undefined, { 'x-action-source': 'agent' })).status).toBeGreaterThanOrEqual(400);
  });

  it('nguồn assistant: xem trước (số nhãn) rồi xác nhận', async () => {
    const { preview, done } = await m.confirm({ format: 'xlsx' });
    expect(preview).toMatchObject({ count: 8 });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency: cùng khoá → cùng việc', async () => {
    const key = uuidv7();
    const a = await m.actWithKey(key, { format: 'csv' });
    const b = await m.actWithKey(key, { format: 'csv' });
    expect(b.body.data.result.job_id).toBe(a.body.data.result.job_id);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
