// Ma trận ai_task.create (TIP-023b): tạo tác vụ (risk config) → cách chạy · lịch · agent · mức AI · hạn credit; chạy tay → cảnh báo chạy
// ngay; cron sai → 422 ở preview. cs có ai_task.manage (tác vụ của mình); undo xoá mềm.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let ag: string;
const base = { model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 500 } as const;

beforeAll(async () => {
  m = await matrix('ai_task.create');
  await teamPlan(m);
  ag = await agent(m, 'Trợ lý báo cáo');
}, 120_000);
afterAll(() => m?.close());

describe('ai_task.create', () => {
  it('cron sai → 422 (mức vượt gói → 402 kiểm ở ai_settings.update — gói Team cho mọi mức)', async () => {
    expect((await m.act({ ...base, name: 'X', goal: 'Y', trigger: 'schedule', cron: 'sai' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ cron: 'invalid' });
  });

  it('preview Trợ lý → xác nhận → undo; chạy tay → cảnh báo', async () => {
    const { preview, done } = await m.confirm({ ...base, name: 'Báo cáo tuần', goal: 'Tổng hợp doanh thu', trigger: 'schedule', cron: '0 8 * * 1' });
    expect(preview).toEqual({
      summary: 'Báo cáo tuần',
      risk: 'config',
      changes: [{ entity: 'ai_task', after: { name: 'Báo cáo tuần', trigger: 'schedule', cron: '0 8 * * 1', event_type: null, agent_id: ag, model_tier: 'standard', credit_limit_per_run: 500, ask_before_send: true } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await m.confirm({ ...base, name: 'Chạy ngay', goal: 'Y', trigger: 'manual' }, m.cs)).preview.warnings).toEqual(['runs_now']);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
