// Ma trận ai_task.update (TIP-023b): sửa tác vụ (risk config) → trước / sau chỉ trường đổi; undo về ảnh chụp cũ. Tác vụ người khác (cs
// scope own) / id lạ → 404 ở preview.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let task: string;
const base = { model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 500 } as const;

beforeAll(async () => {
  m = await matrix('ai_task.update');
  await teamPlan(m);
  await agent(m, 'Trợ lý báo cáo');
  task = (await m.seed('ai_task.create', { ...base, name: 'Báo cáo tuần', goal: 'Tổng hợp', trigger: 'schedule', cron: '0 8 * * 1' })).task_id;
}, 120_000);
afterAll(() => m?.close());

describe('ai_task.update', () => {
  it('cs không thấy tác vụ người khác → 404 · id lạ → 404', async () => {
    expect((await m.act({ task_id: task, patch: { name: 'X' } }, m.cs)).status).toBe(404);
    expect((await m.act({ task_id: '0190f000-0000-7000-8000-00000000beef', patch: { name: 'X' } }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ task_id: task, patch: { cron: '0 9 * * 1', credit_limit_per_run: 800 } });
    expect(preview).toEqual({ summary: 'Báo cáo tuần', risk: 'config', changes: [{ entity: 'ai_task', id: task, before: { cron: '0 8 * * 1', credit_limit_per_run: 500 }, after: { cron: '0 9 * * 1', credit_limit_per_run: 800 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).aiTask.findUniqueOrThrow({ where: { id: task } })).cron).toBe('0 8 * * 1');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
