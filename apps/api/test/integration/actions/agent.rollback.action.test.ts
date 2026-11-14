// Ma trận agent.rollback (TIP-023b): quay lại phiên bản cũ (risk config) → xuất bản lại thành phiên bản kế tiếp + cảnh báo đè bản nháp đang
// sửa; phiên bản lạ → 404 ở preview. 403 sales (không có agents.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';

let m: Matrix;
let ag: string;

beforeAll(async () => {
  m = await matrix('agent.rollback');
  await teamPlan(m);
  ag = await agent(m, 'CSKH Spa');
  await m.seed('agent.update', { agent_id: ag, patch: { threshold: 90 } });
  await m.seed('agent.publish', { agent_id: ag });
  await m.seed('agent.update', { agent_id: ag, patch: { threshold: 60 } });
}, 120_000);
afterAll(() => m?.close());

describe('agent.rollback', () => {
  it('403 sales · phiên bản lạ → 404', async () => {
    expect((await m.act({ agent_id: ag, version: 1 }, m.sales)).status).toBe(403);
    expect((await m.act({ agent_id: ag, version: 9 }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ version: 'not_found' });
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ agent_id: ag, version: 1 });
    expect(preview).toEqual({ summary: 'CSKH Spa · v1', risk: 'config', changes: [{ entity: 'ai_agent', id: ag, before: { version: 2, from: null }, after: { version: 3, from: 1 } }], warnings: ['draft_overwritten'] });
    expect(done.body.data.result).toEqual({ agent_id: ag, version: 3 });
    expect((await (await m.db()).aiAgent.findUniqueOrThrow({ where: { id: ag } })).confidenceThreshold).toBe(70);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
