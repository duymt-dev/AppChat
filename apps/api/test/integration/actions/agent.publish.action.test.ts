// Ma trận agent.publish (TIP-023b): xuất bản bản nháp (risk config) → phiên bản kế tiếp + trạng thái active; agent lạ → 404 ở preview. 403
// sales (không có agents.manage). Undo: ActionDef không khai (quay lại bằng agent.rollback).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let ag: string;

beforeAll(async () => {
  m = await matrix('agent.publish');
  await teamPlan(m);
  ag = await agent(m, 'CSKH Spa', false);
}, 120_000);
afterAll(() => m?.close());

describe('agent.publish', () => {
  it('403 sales · agent lạ → 404', async () => {
    expect((await m.act({ agent_id: ag }, m.sales)).status).toBe(403);
    expect((await m.act({ agent_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ agent_id: ag, note: 'Bản đầu' });
    expect(preview).toEqual({ summary: 'CSKH Spa · v1', risk: 'config', changes: [{ entity: 'ai_agent', id: ag, before: { version: 0, status: 'draft' }, after: { version: 1, status: 'active' } }] });
    expect(done.body.data.result).toEqual({ agent_id: ag, version: 1 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
