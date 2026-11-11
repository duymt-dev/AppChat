// Seed suite `agent-drafting` (TIP-021b): Sales thật (không agents.manage — ca `limited` phải 403) + tập action cấp được cho agent đọc qua
// API thật (`GET /agents/:id/tools` — mọi tool agentGrantable của Builder, D51) để người chấm kiểm mọi tool của bản soạn thuộc tập này.
// Workspace chưa có agent → tạo một agent nháp tối thiểu (không xuất bản). Chỉ chạy trên workspace fixture `[ai-live]`.
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from './channel-seed.mjs';

async function anyAgent(c) {
  const list = (await c.req('GET', '/agents?limit=1')).body?.data ?? [];
  if (list[0]) return list[0].id;
  const r = await c.req('POST', '/actions/agent.create', { input: { name: '[ai-live] catalog' } }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`agent.create → ${r.status}`);
  return r.body.data.result.agent_id;
}

export async function seedAgentDrafting(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const tools = (await c.req('GET', `/agents/${await anyAgent(c)}/tools`)).body?.data?.groups ?? [];
  const grantable = new Set(tools.flatMap((g) => g.tools.map((t) => t.id)));
  if (!grantable.size) throw new Error('không đọc được danh sách tool cấp được cho agent');
  return { ...base, agentDraft: { sales, grantable } };
}
