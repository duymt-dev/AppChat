// Ma trận ai_task.search (TIP-023b R2): happy (bỏ dấu) · 403 (người không có ai_task.manage) · scope (sales chỉ thấy tác vụ mình tạo; kế
// toán insights=all thấy hết — như GET /ai-tasks) · nguồn assistant. Tác vụ dựng ở DB (ai_task.create đẩy queue chạy — đã kiểm ở
// ai-tasks test). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let morning: string;
let mine: string;

beforeAll(async () => {
  m = await matrix('ai_task.search');
  const db = await m.db();
  const task = async (name: string, by: string) => {
    const id = uuidv7();
    await db.aiTask.create({ data: { id, name, goal: 'Tóm tắt', trigger: 'schedule', template: 'briefing', cron: '0 8 * * *', createdByUserId: by } });
    return id;
  };
  morning = await task('Bản tin sáng', m.h.user);
  mine = await task('Nhắc khách quen', m.sales.id);
}, 120_000);
afterAll(() => m?.close());

const ids = (r: { body: { data: { result: { tasks: { id: string }[] } } } }) => r.body.data.result.tasks.map((t) => t.id);

describe('ai_task.search', () => {
  it('happy: bỏ dấu', async () => {
    const r = await m.act({ q: 'ban tin' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.tasks).toEqual([{ id: morning, name: 'Bản tin sáng', status: 'active', trigger: 'schedule', last_run_at: null, last_run_status: null }]);
  });

  it('scope: sales chỉ thấy tác vụ mình tạo; kế toán (insights all) thấy hết', async () => {
    expect(ids(await m.act({}, m.sales))).toEqual([mine]);
    expect(ids(await m.act({}, await m.h.member('accountant'))).sort()).toEqual([morning, mine].sort());
  });

  it('403: vai trò không có ai_task.manage', async () => {
    await (await m.db()).role.create({ data: { id: uuidv7(), key: 'custom:crm_viewer', name: 'Xem khách', permissions: ['crm.view', 'assistant.use'], dataScope: { crm: 'all' } } });
    expect((await m.act({}, await m.h.member('custom:crm_viewer'))).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
