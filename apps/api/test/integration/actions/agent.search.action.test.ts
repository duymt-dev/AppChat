// Ma trận agent.search (TIP-023b R2): happy (bỏ dấu theo tên / vai trò, lọc trạng thái, không trả prompt) · 403 (sales không có
// agents.manage) · nguồn assistant. Scope: cấu hình workspace, không có data scope. Idempotency / undo / trạng thái: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let cs: string;
let sales: string;

beforeAll(async () => {
  m = await matrix('agent.search');
  // Gói Miễn phí chỉ 1 agent — chuyển sang Team như agents test.
  const team = await m.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await m.h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: m.h.ws, planId: team.id, status: 'active', currentPeriodStart: m.h.clock.now() } });
  cs = (await m.seed('agent.create_and_publish', { name: 'Chăm sóc khách', role: 'cs', tools: ['kb.search'], threshold: 70 })).agent_id;
  sales = (await m.seed('agent.create_and_publish', { name: 'Bán hàng', role: 'sales', tools: ['kb.search'], threshold: 70 })).agent_id;
  await m.seed('agent.pause', { agent_id: sales, paused: true });
}, 120_000);
afterAll(() => m?.close());

describe('agent.search', () => {
  it('happy: bỏ dấu, lọc trạng thái, không trả prompt / persona', async () => {
    const r = await m.act({ q: 'cham soc' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.agents).toEqual([{ id: cs, name: 'Chăm sóc khách', role: 'cs', status: 'active', published_version: 1 }]);
    expect((await m.act({ status: 'paused' })).body.data.result.agents.map((a: { id: string }) => a.id)).toEqual([sales]);
  });

  it('403: sales không có agents.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
