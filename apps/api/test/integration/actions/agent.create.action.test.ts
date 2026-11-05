// Ma trận agent.create (TIP-023b): tạo bản nháp (risk config) → tên · kênh · tool · ngưỡng; tool không cấp được → 422 ở preview. 403 sales
// (không có agents.manage). Hạn mức max_agents kiểm ở execute (agents test). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('agent.create');
  await teamPlan(m);
}, 120_000);
afterAll(() => m?.close());

describe('agent.create', () => {
  it('403 sales · tool không cấp được → 422', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'X', tools: ['nope.tool'] }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ tools: 'not_grantable:nope.tool' });
  });

  it('preview Trợ lý → xác nhận (bản nháp)', async () => {
    const { preview, done } = await m.confirm({ name: 'CSKH Spa', channels: ['zalo_personal'] });
    expect(preview).toEqual({ summary: 'CSKH Spa', risk: 'config', count: 1, changes: [{ entity: 'ai_agent', after: { name: 'CSKH Spa', channels: ['zalo_personal'], tools: [], threshold: 70 } }] });
    const a = await (await m.db()).aiAgent.findUniqueOrThrow({ where: { id: done.body.data.result.agent_id } });
    expect([a.status, a.publishedVersion]).toEqual(['draft', 0]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
