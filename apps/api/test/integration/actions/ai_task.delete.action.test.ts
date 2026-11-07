// Ma trận ai_task.delete (TIP-023b): xoá mềm tác vụ (risk config) → tên · cách chạy · trạng thái; undo khôi phục. Tác vụ người khác (cs scope
// own) / id lạ → 404 ở preview.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let task: string;
const base = { model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 500 } as const;

beforeAll(async () => {
  m = await matrix('ai_task.delete');
  await teamPlan(m);
  await agent(m, 'Trợ lý báo cáo');
  task = (await m.seed('ai_task.create', { ...base, name: 'Báo cáo tuần', goal: 'Tổng hợp', trigger: 'schedule', cron: '0 8 * * 1' })).task_id;
}, 120_000);
afterAll(() => m?.close());

describe('ai_task.delete', () => {
  it('cs không thấy tác vụ người khác → 404 · id lạ → 404', async () => {
    expect((await m.act({ task_id: task }, m.cs)).status).toBe(404);
    expect((await m.act({ task_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ task_id: task });
    expect(preview).toEqual({ summary: 'Báo cáo tuần', risk: 'config', changes: [{ entity: 'ai_task', id: task, before: { name: 'Báo cáo tuần', trigger: 'schedule', status: 'active' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).aiTask.findUniqueOrThrow({ where: { id: task } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
