// Ma trận data_job.cancel (TIP-045b annex D): huỷ việc nền của chính mình → cancelling (lặp lại an toàn); việc đã xong → 409; việc người
// khác / id lạ → 404 (không lộ là có); nguồn assistant qua xem trước.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

async function job(actorId: string, status = 'queued') {
  const db = await m.db();
  const id = uuidv7();
  const now = m.h.clock.now();
  await db.dataJob.create({ data: { id, kind: 'contact.bulk_update', actionId: 'contact.bulk_update', actorId, inputHash: 'x', input: { patch: {} }, status, total: 1, createdAt: now, updatedAt: now } });
  return id;
}

beforeAll(async () => {
  m = await matrix('data_job.cancel');
}, 120_000);
afterAll(() => m?.close());

describe('data_job.cancel', () => {
  it('của mình đang chờ → cancelling, lặp lại 200; đã xong 409; người khác / id lạ 404', async () => {
    const mine = await job(m.h.user);
    expect((await m.act({ job_id: mine })).body.data.result).toEqual({ status: 'cancelling' });
    expect((await m.act({ job_id: mine })).body.data.result).toEqual({ status: 'cancelling' });
    expect((await m.act({ job_id: await job(m.h.user, 'completed') })).status).toBe(409);
    expect((await m.act({ job_id: mine }, m.sales)).status).toBe(404);
    expect((await m.act({ job_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('không còn quyền action gốc (accountant không có crm.edit) → 404 cả với việc của chính mình; sales còn quyền → huỷ được', async () => {
    const acc = await m.h.member('accountant');
    expect((await m.act({ job_id: await job(acc.id) }, acc)).status).toBe(404);
    expect((await m.act({ job_id: await job(m.sales.id) }, m.sales)).body.data.result).toEqual({ status: 'cancelling' });
  });

  it('nguồn assistant: xem trước rồi xác nhận', async () => {
    const id = await job(m.h.user);
    const { preview, done } = await m.confirm({ job_id: id });
    expect(preview.changes[0]).toMatchObject({ entity: 'data_job', after: { status: 'cancelling' } });
    expect(done.body.data.result).toEqual({ status: 'cancelling' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
