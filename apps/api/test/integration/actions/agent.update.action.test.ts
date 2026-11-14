// Ma trận agent.update (TIP-023b): sửa bản nháp (risk config) → trước / sau chỉ trường đổi + cảnh báo bản nháp khi đã xuất bản; undo về
// cấu hình cũ. Agent lạ → 404 ở preview. 403 sales (không có agents.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let ag: string;

beforeAll(async () => {
  m = await matrix('agent.update');
  await teamPlan(m);
  ag = await agent(m, 'CSKH Spa');
}, 120_000);
afterAll(() => m?.close());

describe('agent.update', () => {
  it('403 sales · agent lạ → 404', async () => {
    expect((await m.act({ agent_id: ag, patch: { threshold: 80 } }, m.sales)).status).toBe(403);
    expect((await m.act({ agent_id: '0190f000-0000-7000-8000-00000000beef', patch: { threshold: 80 } }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ agent_id: ag, patch: { threshold: 85, persona: 'Nhẹ nhàng' } });
    expect(preview).toEqual({ summary: 'CSKH Spa', risk: 'config', changes: [{ entity: 'ai_agent', id: ag, before: { threshold: 70, persona: '' }, after: { threshold: 85, persona: 'Nhẹ nhàng' } }], warnings: ['draft_until_publish'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).aiAgent.findUniqueOrThrow({ where: { id: ag } })).confidenceThreshold).toBe(70);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
