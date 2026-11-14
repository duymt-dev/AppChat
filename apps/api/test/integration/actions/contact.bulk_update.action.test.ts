// Ma trận contact.bulk_update (TIP-045b annex D): bulk → luôn xem trước kèm số bản ghi (cả ui); ≤ 50 kết quả từng bản ghi; > 50 → 202
// job_accepted; 403 accountant (thiếu crm.edit); ngoài scope = lỗi riêng bản ghi đó; agent không được cấp (agentGrantable false); idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { call } from '../setup';

let m: Matrix;
let a = '';
let b = '';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const confirmUi = async (input: unknown, who?: { token: string }) => {
  const hdr: Record<string, string> = who ? { authorization: `Bearer ${who.token}` } : {};
  const p = await call(m.h, '/actions/contact.bulk_update', { input }, { 'idempotency-key': uuidv7(), ...hdr });
  const pv = (await p.json()) as Body;
  const r = await call(m.h, '/actions/contact.bulk_update', { input, confirm_token: pv.data.confirm_token }, { 'idempotency-key': uuidv7(), ...hdr });
  return { pv: { status: p.status, data: pv.data }, done: { status: r.status, body: (await r.json()) as Body } };
};

beforeAll(async () => {
  m = await matrix('contact.bulk_update');
  a = (await m.seed('contact.create', { full_name: 'BU sales', phone: '0913000001' }, m.sales)).contact_id;
  b = (await m.seed('contact.create', { full_name: 'BU owner', phone: '0913000002' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.bulk_update', () => {
  it('ui: xem trước kèm số bản ghi rồi xác nhận; owner sửa cả hai, kết quả từng bản ghi', async () => {
    const { pv, done } = await confirmUi({ contact_ids: [a, b], patch: { group: 'loyal', add_tags: ['Đợt A'] } });
    expect(pv.status).toBe(202);
    expect(pv.data).toMatchObject({ status: 'preview_required', preview: { count: 2 } });
    expect(done.status).toBe(200);
    expect(done.body.data.result).toMatchObject({ updated: 2, failed: 0 });
  });

  it('sales: khách ngoài scope lỗi riêng; accountant thiếu crm.edit → 403', async () => {
    const { done } = await confirmUi({ contact_ids: [a, b], patch: { city: 'Huế' } }, m.sales);
    expect(done.body.data.result.items).toEqual([
      { id: a, status: 'done', error: null },
      { id: b, status: 'failed', error: 'NOT_FOUND:contact_id' },
    ]);
    expect((await m.act({ contact_ids: [a], patch: { city: 'X' } }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('không đổi gì → skipped; patch không cho đổi người phụ trách (bị bỏ khỏi schema)', async () => {
    const { done } = await confirmUi({ contact_ids: [a], patch: { city: 'Huế' } });
    expect(done.body.data.result.items[0]).toMatchObject({ status: 'skipped' });
    const db = await m.db();
    const { done: own } = await confirmUi({ contact_ids: [a], patch: { owner_user_id: m.h.user } as never });
    expect(own.status).toBe(200);
    expect((await db.contact.findUniqueOrThrow({ where: { id: a } })).ownerUserId).toBe(m.sales.id);
  });

  it('> 50 → 202 job_accepted, biên nhận đủ số id (trùng bỏ)', async () => {
    const ids = [...Array.from({ length: 51 }, () => uuidv7()), a, a];
    const { done } = await confirmUi({ contact_ids: ids, patch: { city: 'Vinh' } });
    expect(done.status, JSON.stringify(done.body)).toBe(202);
    expect(done.body.data).toMatchObject({ status: 'job_accepted' });
    const db = await m.db();
    expect(await db.dataJobItem.count({ where: { jobId: done.body.data.job_id } })).toBe(52);
  });

  it('nguồn agent: không được cấp → bị chặn; assistant: xem trước rồi xác nhận', async () => {
    const ag = await m.act({ contact_ids: [a], patch: { city: 'Y' } }, undefined, { 'x-action-source': 'agent' });
    expect(ag.status).toBeGreaterThanOrEqual(400);
    const { preview, done } = await m.confirm({ contact_ids: [a], patch: { city: 'Đà Nẵng' } });
    expect(preview.count).toBe(1);
    expect(done.body.data.result).toMatchObject({ updated: 1 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
