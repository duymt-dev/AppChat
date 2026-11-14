// Mock kế hoạch Cowork (TIP-023d §6): lượt "kế hoạch" → thẻ; sửa → paused (epoch + 1); chỉ bước chưa chạy sửa được; revision cũ → 409;
// tiếp tục → active; gợi ý tái dùng → bản nháp pending; lượt kèm plan_draft gắn bản nháp; agent_choices chỉ agent đang chạy.
import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createAssistantState } from './assistant';
import { createAgentsState } from './agents';
import { resetPlans } from './assistant-plans';

type Plan = { id: string; revision: number; phase: string; plan_epoch: number; steps: { id: string; state: string; title: string }[]; progress: number };
const plan = (sid: string) => mockTransport.get<{ data: Plan | null }>(`/assistant/sessions/${sid}/plan`).then((r) => r.data);
const res = <T>(r: Awaited<ReturnType<typeof mockTransport.action>>) => (r.status === 200 ? (r.data.result as T) : (null as T));

describe('mock assistant-plans', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().assistant = createAssistantState();
    mockDb().agents = createAgentsState();
    resetPlans();
  });

  it('lượt Cowork "kế hoạch" → thẻ; sửa / lưu bước chưa chạy / tiếp tục; revision cũ → 409', async () => {
    const t = await mockTransport.post<{ session_id: string }>('/assistant/messages', { mode: 'cowork', text: 'Lập kế hoạch chăm sóc khách mới' });
    const p = (await plan(t.session_id))!;
    expect(p).toMatchObject({ phase: 'active', revision: 1 });
    expect(p.progress).toBeCloseTo(1 / 3);
    await mockTransport.action('assistant.plan_request_edit', { plan_id: p.id, if_revision: 1 });
    expect(await plan(t.session_id)).toMatchObject({ phase: 'paused', plan_epoch: 1 });
    const done = p.steps.find((s) => s.state === 'succeeded')!;
    await expect(mockTransport.action('assistant.plan_update', { plan_id: p.id, if_revision: 1, ops: [{ op: 'remove', step_id: done.id }] })).rejects.toMatchObject({ status: 409 });
    const last = p.steps.at(-1)!;
    await mockTransport.action('assistant.plan_update', { plan_id: p.id, if_revision: 1, ops: [{ op: 'update', step_id: last.id, patch: { title: 'Gửi báo giá qua Zalo' } }] });
    expect((await plan(t.session_id))!.steps.at(-1)!.title).toBe('Gửi báo giá qua Zalo');
    await expect(mockTransport.action('assistant.plan_resume', { plan_id: p.id, if_revision: 1 })).rejects.toMatchObject({ status: 409 });
    await mockTransport.action('assistant.plan_resume', { plan_id: p.id, if_revision: 2 });
    expect(await plan(t.session_id)).toMatchObject({ phase: 'active', revision: 2 });
  });

  it('gợi ý tái dùng → bản nháp pending; lượt kèm plan_draft gắn bản nháp; không trùng → rỗng', async () => {
    const t = await mockTransport.post<{ session_id: string }>('/assistant/messages', { mode: 'cowork', text: 'chào' });
    expect(await plan(t.session_id)).toBeNull();
    expect(res<{ candidates: unknown[] }>(await mockTransport.action('assistant.plan_reusable', { limit: 3, text: 'lịch hẹn spa' })).candidates).toEqual([]);
    const [c] = res<{ candidates: { id: string }[] }>(await mockTransport.action('assistant.plan_reusable', { limit: 3, text: 'báo giá khách' })).candidates;
    const d = res<{ plan_id: string; revision: number }>(await mockTransport.action('assistant.plan_reuse', { candidate_id: c!.id, session_id: t.session_id }));
    expect((await plan(t.session_id))!.steps.every((s) => s.state === 'pending')).toBe(true);
    await mockTransport.post('/assistant/messages', { mode: 'cowork', text: 'làm như lần trước', session_id: t.session_id, plan_draft: d });
    expect(await plan(t.session_id)).toMatchObject({ id: d.plan_id, phase: 'active' });
  });

  it('agent_choices: chỉ agent đang chạy, có id + vai trò + mức', async () => {
    const r = await mockTransport.get<{ data: { id: string; model_tier: string }[] }>('/assistant/agent-choices');
    const active = mockDb().agents.agents.filter((a) => !a.deleted && a.status === 'active');
    expect(r.data.map((a) => a.id)).toEqual(active.map((a) => a.id));
  });
});
