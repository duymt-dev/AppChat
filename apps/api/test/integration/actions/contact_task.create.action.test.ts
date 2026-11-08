// Ma trận contact_task.create (TIP-026b §1.2): crm.edit, write, agentGrantable=false, undo 24h — việc chăm sóc thủ công (không AI, không
// lịch hẹn). Trợ lý → preview; người được giao không đủ điều kiện → 422; idempotency → cùng việc; hoàn tác → huỷ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact_task.create');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400004' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_task.create', () => {
  it('Trợ lý preview → xác nhận; giao người lạ 422; cùng khoá idempotency → một việc; hoàn tác huỷ', async () => {
    const { done } = await m.confirm({ contact_id: contact, title: 'Gọi lại' });
    expect(done.body.data.result.version).toBe(1);
    expect((await m.act({ contact_id: contact, title: 'x', assignee_user_id: uuidv7() })).status).toBe(422);
    const key = uuidv7();
    const a = await m.actWithKey(key, { contact_id: contact, title: 'Một lần' });
    const b = await m.actWithKey(key, { contact_id: contact, title: 'Một lần' });
    expect(b.body.data.result.task_id).toBe(a.body.data.result.task_id);
    expect((await m.undo(a.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactTask.findUniqueOrThrow({ where: { id: a.body.data.result.task_id } })).state).toBe('cancelled');
  });
  it('sales 404', async () => {
    expect((await m.act({ contact_id: contact, title: 'x' }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
