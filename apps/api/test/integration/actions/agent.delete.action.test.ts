// Ma trận agent.delete (TIP-023b): xoá mềm (risk delete) → tên · trạng thái · phiên bản; đang phụ trách tài khoản kênh → 409 HAS_DEPENDENCIES
// ở preview; undo khôi phục. 403 sales (không có agents.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';
import { agent } from '../helpers/ai-fixtures';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let ag: string;
let busy: string;

beforeAll(async () => {
  m = await matrix('agent.delete');
  await teamPlan(m);
  ag = await agent(m, 'CSKH Spa');
  busy = await agent(m, 'Agent Zalo');
  await account(m, 'zalo_personal', 'Zalo Cửa hàng', { settings: { agent_id: busy } });
}, 120_000);
afterAll(() => m?.close());

describe('agent.delete', () => {
  it('403 sales · agent lạ → 404 · đang phụ trách kênh → 409', async () => {
    expect((await m.act({ agent_id: ag }, m.sales)).status).toBe(403);
    expect((await m.act({ agent_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
    expect((await m.act({ agent_id: busy }, undefined, { 'x-action-source': 'assistant' })).body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { channel_accounts: 'Zalo Cửa hàng' } });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ agent_id: ag });
    expect(preview).toEqual({ summary: 'CSKH Spa', risk: 'delete', changes: [{ entity: 'ai_agent', id: ag, before: { name: 'CSKH Spa', status: 'active', version: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).aiAgent.findUniqueOrThrow({ where: { id: ag } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
