// Ma trận ai_task.run_now (TIP-023b): chạy ngay (risk write) → lượt chạy mới (mức AI · hạn credit); đang có lượt dở → 409 ở preview. Tác vụ
// người khác (cs scope own) / id lạ → 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let task: string;
const base = { model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 500 } as const;

beforeAll(async () => {
  m = await matrix('ai_task.run_now');
  await teamPlan(m);
  await agent(m, 'Trợ lý báo cáo');
  task = (await m.seed('ai_task.create', { ...base, name: 'Báo cáo tuần', goal: 'Tổng hợp', trigger: 'schedule', cron: '0 8 * * 1' })).task_id;
}, 120_000);
afterAll(() => m?.close());

describe('ai_task.run_now', () => {
  it('cs không thấy tác vụ người khác → 404 · id lạ → 404', async () => {
    expect((await m.act({ task_id: task }, m.cs)).status).toBe(404);
    expect((await m.act({ task_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; đang chạy → 409', async () => {
    const { preview, done } = await m.confirm({ task_id: task });
    expect(preview).toEqual({ summary: 'Báo cáo tuần', risk: 'write', changes: [{ entity: 'ai_run', after: { task: 'Báo cáo tuần', model_tier: 'standard', max_credits: 500 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ task_id: task }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ task_id: 'running' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
