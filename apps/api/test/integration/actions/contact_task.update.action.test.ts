// Ma trận contact_task.update (TIP-026b §2): crm.edit, write, agentGrantable=false, undo 24h — CAS if_version (lệch 409); hoàn tác trả
// bản trước nếu chưa bị sửa tiếp.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let task = '';

beforeAll(async () => {
  m = await matrix('contact_task.update');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400005' })).contact_id;
  task = (await m.seed('contact_task.create', { contact_id: contact, title: 'Ban đầu' })).task_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_task.update', () => {
  it('if_version lệch 409; sửa → v2; hoàn tác → tiêu đề cũ', async () => {
    expect((await m.act({ task_id: task, if_version: 7, patch: { title: 'x' } })).status).toBe(409);
    const r = await m.act({ task_id: task, if_version: 1, patch: { title: 'Đã sửa' } });
    expect(r.body.data.result.version).toBe(2);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactTask.findUniqueOrThrow({ where: { id: task } })).title).toBe('Ban đầu');
  });
  it('sales 404; id lạ 404', async () => {
    expect((await m.act({ task_id: task, patch: { title: 'x' } }, m.sales)).status).toBe(404);
    expect((await m.act({ task_id: uuidv7(), patch: { title: 'x' } })).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
