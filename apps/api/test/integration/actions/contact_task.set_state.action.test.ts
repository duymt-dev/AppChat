// Ma trận contact_task.set_state (TIP-026b §2): open ↔ done, → cancelled, cancelled → open tường minh; done lặp không đổi version;
// hoàn tác trả trạng thái trước.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let task = '';

beforeAll(async () => {
  m = await matrix('contact_task.set_state');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400006' })).contact_id;
  task = (await m.seed('contact_task.create', { contact_id: contact, title: 'Việc' })).task_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_task.set_state', () => {
  it('done → done lặp cùng version → hoàn tác về open', async () => {
    const r = await m.act({ task_id: task, if_version: 1, state: 'done' });
    expect(r.body.data.result).toMatchObject({ state: 'done', version: 2 });
    expect((await m.act({ task_id: task, state: 'done' })).body.data.result.version).toBe(2);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactTask.findUniqueOrThrow({ where: { id: task } })).state).toBe('open');
  });
  it('sales 404', async () => {
    expect((await m.act({ task_id: task, state: 'done' }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
