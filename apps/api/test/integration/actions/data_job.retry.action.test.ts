// Ma trận data_job.retry (TIP-045b annex D): việc đã kết thúc có bản ghi lỗi → chỉ bản ghi lỗi về pending + 202 job_accepted (cùng handle);
// không có gì để thử lại / việc đang chạy → 409; input bị sửa (hash lệch) → 409; người khác → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { createHash } from 'node:crypto';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const INPUT = { patch: { city: 'Huế' } };
// sha256 input chuẩn hoá — tính như kernel (khoá sắp xếp) để dựng việc thật.
const HASH = createHash('sha256').update(JSON.stringify(INPUT)).digest('hex');

async function job(status: string, items: string[], hash = HASH) {
  const db = await m.db();
  const id = uuidv7();
  const now = m.h.clock.now();
  await db.dataJob.create({ data: { id, kind: 'contact.bulk_update', actionId: 'contact.bulk_update', actorId: m.h.user, inputHash: hash, input: INPUT, status, total: items.length, createdAt: now, updatedAt: now } });
  await db.dataJobItem.createMany({ data: items.map((s, seq) => ({ jobId: id, seq, targetId: uuidv7(), status: s, error: s === 'failed' ? 'NOT_FOUND:contact_id' : null })) });
  return id;
}

beforeAll(async () => {
  m = await matrix('data_job.retry');
}, 120_000);
afterAll(() => m?.close());

describe('data_job.retry', () => {
  it('chỉ bản ghi lỗi về pending → 202 job_accepted (cùng handle); bản ghi đã xong giữ nguyên', async () => {
    const id = await job('completed', ['done', 'failed', 'skipped', 'failed']);
    const r = await m.act({ job_id: id });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data).toMatchObject({ status: 'job_accepted', job_id: id, status_url: `/v1/data-jobs/${id}` });
    const db = await m.db();
    expect((await db.dataJobItem.findMany({ where: { jobId: id }, orderBy: { seq: 'asc' } })).map((i) => i.status)).toEqual(['done', 'pending', 'skipped', 'pending']);
    expect((await db.dataJob.findUniqueOrThrow({ where: { id } })).status).toBe('queued');
  });

  it('không có gì để thử lại / đang chạy / input bị sửa → 409; người khác → 404', async () => {
    expect((await m.act({ job_id: await job('completed', ['done']) })).status).toBe(409);
    expect((await m.act({ job_id: await job('running', ['failed']) })).status).toBe(409);
    expect((await m.act({ job_id: await job('failed', ['failed'], 'deadbeef') })).status).toBe(409);
    expect((await m.act({ job_id: await job('failed', ['failed']) }, m.sales)).status).toBe(404);
  });

  it('idempotency: cùng khoá gửi lại trả đúng handle 202, không đặt lại lần hai', async () => {
    const id = await job('failed', ['failed']);
    const key = uuidv7();
    const a = await m.actWithKey(key, { job_id: id });
    const b = await m.actWithKey(key, { job_id: id });
    expect(a.status).toBe(202);
    expect(b.body.data).toEqual(a.body.data);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
