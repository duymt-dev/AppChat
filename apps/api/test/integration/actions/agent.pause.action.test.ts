// Ma trận agent.pause (TIP-023b): tạm dừng / chạy (risk config) → trạng thái trước / sau; bản nháp chưa xuất bản → 409, agent lạ → 404 ở
// preview. 403 sales (không có agents.manage). Undo: ActionDef không khai (đảo lại bằng paused: false).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let ag: string;
let draft: string;

beforeAll(async () => {
  m = await matrix('agent.pause');
  await teamPlan(m);
  ag = await agent(m, 'CSKH Spa');
  draft = await agent(m, 'Nháp', false);
}, 120_000);
afterAll(() => m?.close());

describe('agent.pause', () => {
  it('403 sales · agent lạ → 404 · bản nháp → 409', async () => {
    expect((await m.act({ agent_id: ag, paused: true }, m.sales)).status).toBe(403);
    expect((await m.act({ agent_id: '0190f000-0000-7000-8000-00000000beef', paused: true }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
    expect((await m.act({ agent_id: draft, paused: true }, undefined, { 'x-action-source': 'assistant' })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ agent_id: ag, paused: true });
    expect(preview).toEqual({ summary: 'CSKH Spa', risk: 'config', changes: [{ entity: 'ai_agent', id: ag, before: { status: 'active' }, after: { status: 'paused' } }] });
    expect(done.body.data.result).toEqual({ agent_id: ag, status: 'paused' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
