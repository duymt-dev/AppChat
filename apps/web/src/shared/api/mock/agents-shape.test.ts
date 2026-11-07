// TIP-021: route mock AI Agents / duyệt / governance / quyền agent đúng shape đọc dùng chung với API thật (packages/shared/src/api/ai.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { agentSchema, agentStatsSchema, agentTemplateSchema, agentToolsSchema, agentVersionSchema, approvalRowSchema, governanceSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (schema: z.ZodType, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.slice(0, 3);
};

describe('mock AI Agents — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /agents · /agents/:id · versions · templates · tools', async () => {
    const list = await mockTransport.get<{ data: unknown[] }>('/agents');
    expect(issues(z.array(agentSchema), list.data)).toEqual([]);
    const id = (list.data[0] as { id: string }).id;
    expect(issues(agentSchema, await mockTransport.get(`/agents/${id}`))).toEqual([]);
    expect(issues(z.array(agentVersionSchema), (await mockTransport.get<{ data: unknown[] }>(`/agents/${id}/versions`)).data)).toEqual([]);
    expect(issues(z.array(agentTemplateSchema), (await mockTransport.get<{ data: unknown[] }>('/agent-templates')).data)).toEqual([]);
    expect(issues(agentToolsSchema, await mockTransport.get(`/agents/${id}/tools`))).toEqual([]);
    // TIP-038: thống kê có nguồn — cùng schema API; thẻ kèm `stats`.
    expect(issues(agentStatsSchema, await mockTransport.get(`/agents/${id}/stats`))).toEqual([]);
    expect((list.data[0] as { stats?: unknown }).stats).toMatchObject({ agent_id: id, csat: { available: expect.any(Boolean) } });
  });

  it('GET /conversations/:id/agent-tools · /approvals · /settings/governance', async () => {
    const convs = await mockTransport.get<{ data: { id: string }[] }>('/conversations');
    expect(issues(agentToolsSchema, await mockTransport.get(`/conversations/${convs.data[0]!.id}/agent-tools`))).toEqual([]);
    expect(issues(z.array(approvalRowSchema), (await mockTransport.get<{ data: unknown[] }>('/approvals', { status: 'all' })).data)).toEqual([]);
    expect(issues(governanceSchema, await mockTransport.get('/settings/governance'))).toEqual([]);
  });

  it('TIP-024: mẫu lọc theo vai trò có defaults; sửa & duyệt → tab Đã duyệt (edited, input đã sửa)', async () => {
    const cs = (await mockTransport.get<{ data: { role: string; defaults: { tools: string[] } }[] }>('/agent-templates', { role: 'cs' })).data;
    expect(cs.length).toBeGreaterThan(0);
    expect(cs.every((t) => t.role === 'cs' && t.defaults.tools.length > 0)).toBe(true);
    await mockTransport.action('approval.edit_and_approve', { approval_id: 'ap_1', edited_input: { note: 'Chỉ nhóm VIP' } });
    const approved = (await mockTransport.get<{ data: { id: string; status: string; input: Record<string, unknown> }[] }>('/approvals', { status: 'approved' })).data;
    expect(approved.find((a) => a.id === 'ap_1')).toMatchObject({ status: 'edited', input: { note: 'Chỉ nhóm VIP' } });
    expect(issues(z.array(approvalRowSchema), approved)).toEqual([]);
  });
});
