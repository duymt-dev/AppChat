// Ma trận agent.create_and_publish (TIP-023b, D29): tạo + xuất bản (risk config) → agent mới v1 đang hoạt động + cảnh báo goes_live; tool
// không cấp được → 422 ở preview; undo = tạm dừng + xoá mềm. 403 sales (không có agents.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('agent.create_and_publish');
  await teamPlan(m);
}, 120_000);
afterAll(() => m?.close());

describe('agent.create_and_publish', () => {
  it('403 sales · tool không cấp được → 422', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'X', tools: ['nope.tool'] }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ tools: 'not_grantable:nope.tool' });
  });

  it('preview Trợ lý → xác nhận (v1 hoạt động) → undo', async () => {
    const { preview, done } = await m.confirm({ name: 'CSKH Spa', channels: ['zalo_personal'] });
    expect(preview).toEqual({
      summary: 'CSKH Spa · v1',
      risk: 'config',
      count: 1,
      changes: [{ entity: 'ai_agent', after: { name: 'CSKH Spa', channels: ['zalo_personal'], tools: [], threshold: 70, status: 'active', version: 1 } }],
      warnings: ['goes_live'],
    });
    const id = done.body.data.result.agent_id;
    const a = await (await m.db()).aiAgent.findUniqueOrThrow({ where: { id } });
    expect([a.status, a.publishedVersion]).toEqual(['active', 1]);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const b = await (await m.db()).aiAgent.findUniqueOrThrow({ where: { id } });
    expect([b.status, b.deletedAt !== null]).toEqual(['paused', true]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
