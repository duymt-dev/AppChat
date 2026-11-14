// Ma trận contact.transfer_owner_bulk (TIP-015d §2.6): crm.reassign, bulk → luôn xem trước kèm số bản ghi (cả ui); ≤ 50 mỗi khách một lần
// chuyển + kết quả từng khách; > 50 → 202 job_accepted; sales thiếu crm.reassign → 403; Trợ lý → approval_required (duyệt bắt buộc);
// agent không được cấp (agentGrantable false); không hoàn tác gộp (mỗi lần chuyển có biên nhận riêng).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { call } from '../setup';

let m: Matrix;
let a = '';
let b = '';
const MOVE = { conversations: true, quotes: true, appointments: true };

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const confirmUi = async (input: unknown) => {
  const p = await call(m.h, '/actions/contact.transfer_owner_bulk', { input }, { 'idempotency-key': uuidv7() });
  const pv = (await p.json()) as Body;
  const r = await call(m.h, '/actions/contact.transfer_owner_bulk', { input, confirm_token: pv.data.confirm_token }, { 'idempotency-key': uuidv7() });
  return { pv: { status: p.status, data: pv.data }, done: { status: r.status, body: (await r.json()) as Body } };
};

beforeAll(async () => {
  m = await matrix('contact.transfer_owner_bulk');
  a = (await m.seed('contact.create', { full_name: 'TB một', phone: '0913400001' })).contact_id;
  b = (await m.seed('contact.create', { full_name: 'TB hai', phone: '0913400002' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.transfer_owner_bulk', () => {
  it('ui: xem trước kèm số bản ghi rồi xác nhận; mỗi khách một biên nhận; lần hai → đã là người phụ trách', async () => {
    const { pv, done } = await confirmUi({ contact_ids: [a, b], to_user_id: m.sales.id, move: MOVE });
    expect(pv.status).toBe(202);
    expect(pv.data).toMatchObject({ status: 'preview_required', preview: { count: 2 } });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ transferred: 2, skipped: 0, failed: 0 });
    expect(done.body.data.undo_until ?? null).toBeNull();
    const db = await m.db();
    expect(await db.contactTransfer.count({ where: { contactId: { in: [a, b] } } })).toBe(2);
    const again = await confirmUi({ contact_ids: [a], to_user_id: m.sales.id, move: MOVE });
    expect(again.done.body.data.result.items[0]).toMatchObject({ id: a, status: 'skipped_already_owner', transfer_id: null });
  });

  it('sales thiếu crm.reassign → 403; người nhận không phải thành viên → 422', async () => {
    expect((await m.act({ contact_ids: [a], to_user_id: m.h.user, move: MOVE }, m.sales)).status).toBe(403);
    // Xem trước không kiểm người nhận; chạy thật sau xác nhận → 422, không đổi gì.
    const { done } = await confirmUi({ contact_ids: [a], to_user_id: uuidv7(), move: MOVE });
    expect(done.status).toBe(422);
    expect(done.body.error.fields).toMatchObject({ to_user_id: 'not_member' });
  });

  it('> 50 → 202 job_accepted, biên nhận đủ số id (trùng bỏ)', async () => {
    const ids = [...Array.from({ length: 51 }, () => uuidv7()), a, a];
    const { done } = await confirmUi({ contact_ids: ids, to_user_id: m.h.user, move: MOVE });
    expect(done.status, JSON.stringify(done.body)).toBe(202);
    expect(done.body.data).toMatchObject({ status: 'job_accepted' });
    const db = await m.db();
    expect(await db.dataJobItem.count({ where: { jobId: done.body.data.job_id } })).toBe(52);
  });

  it('Trợ lý → approval_required (không chạy); agent không được cấp → bị chặn', async () => {
    const as = await m.act({ contact_ids: [b], to_user_id: m.h.user, move: MOVE }, undefined, { 'x-action-source': 'assistant' });
    expect(as.body.data?.status, JSON.stringify(as.body)).toBe('approval_required');
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: b } })).ownerUserId).toBe(m.sales.id);
    const ag = await m.act({ contact_ids: [b], to_user_id: m.h.user, move: MOVE }, undefined, { 'x-action-source': 'agent' });
    expect(ag.status).toBeGreaterThanOrEqual(400);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
