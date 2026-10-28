import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createAssistantState } from './assistant';
import { createAgentsState } from './agents';

type Events = { session_id: string; events: { type: string; confirm_token?: string; text?: string; route?: string }[] };
type Logs = { data: { id: string; status: string; undone?: boolean; kind: string; action_id: string }[]; total: number };
type Approvals = { data: { id: string; can_decide: boolean; status: string }[] };
type Agents = { data: { id: string; status: string; version: number }[] };
const resultOf = <T>(r: Awaited<ReturnType<typeof mockTransport.action>>) => (r.status === 200 ? (r.data.result as T) : (null as T));

describe('mock assistant + agents', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().assistant = createAssistantState();
    mockDb().agents = createAgentsState();
  });

  it('lượt chat: ý định có action → thẻ xác nhận; xác nhận → ghi nhật ký nguồn assistant', async () => {
    const turn = await mockTransport.post<Events>('/assistant/messages', { mode: 'chat', text: 'Tạo báo giá cho chị Lan' });
    const card = turn.events[0]!;
    expect(card.type).toBe('confirm');
    const done = await mockTransport.post<{ status: string; ui_target: { route: string } }>('/assistant/confirm', { confirm_token: card.confirm_token, decision: 'confirm' });
    expect(done.ui_target.route).toBe('/quotes');
    const logs = await mockTransport.get<Logs>('/action-logs');
    expect(logs.data[0]!.action_id).toBe('quote.create');
    await expect(mockTransport.post('/assistant/confirm', { confirm_token: card.confirm_token, decision: 'confirm' })).rejects.toMatchObject({ status: 409 });
  });

  it('câu hỏi thường → trả lời mẫu, huỷ thẻ không ghi nhật ký', async () => {
    const turn = await mockTransport.post<Events>('/assistant/messages', { text: 'Tóm tắt tình hình kinh doanh hôm nay' });
    expect(turn.events[0]).toMatchObject({ type: 'delta' });
    const t2 = await mockTransport.post<Events>('/assistant/messages', { text: 'tạo ticket nhắc việc' });
    await mockTransport.post('/assistant/confirm', { confirm_token: t2.events[0]!.confirm_token, decision: 'cancel' });
    expect((await mockTransport.get<Logs>('/action-logs')).total).toBe(10);
  });

  it('nhật ký: lọc theo loại / trạng thái, hoàn tác dòng mẫu', async () => {
    expect((await mockTransport.get<Logs>('/action-logs', { kind: 'send' })).data).toHaveLength(2);
    expect((await mockTransport.get<Logs>('/action-logs', { status: 'pending' })).data).toHaveLength(1);
    await mockTransport.undo('al_seed_1');
    expect((await mockTransport.get<Logs>('/action-logs', { status: 'undone' })).data.map((l) => l.id)).toEqual(['al_seed_1']);
    await expect(mockTransport.undo('al_seed_4')).rejects.toMatchObject({ status: 409 });
  });

  it('duyệt: Chủ sở hữu duyệt được; Quản lý không có quyền hoàn tiền → không duyệt được yêu cầu hoàn tiền', async () => {
    await mockTransport.action('approval.approve', { approval_id: 'ap_1' });
    expect((await mockTransport.get<Approvals>('/approvals')).data).toHaveLength(2);
    setMockRole('manager');
    const rows = (await mockTransport.get<Approvals>('/approvals')).data;
    expect(rows.find((a) => a.id === 'ap_3')?.can_decide).toBe(false);
    await expect(mockTransport.action('approval.approve', { approval_id: 'ap_3' })).rejects.toMatchObject({ status: 403 });
    setMockRole('sales');
    await expect(mockTransport.action('approval.reject', { approval_id: 'ap_2' })).rejects.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('agent: tạo & xuất bản (D29) → v1 active; sửa nháp → xuất bản v2 → quay lại v1 = v3', async () => {
    const created = resultOf<{ agent_id: string; version: number }>(
      await mockTransport.action('agent.create_and_publish', { name: 'CSKH Spa', role: 'cs', model_tier: 'advanced' }),
    );
    expect(created.version).toBe(1);
    await mockTransport.action('agent.update', { agent_id: created.agent_id, patch: { threshold: 85 } });
    await mockTransport.action('agent.publish', { agent_id: created.agent_id, note: 'Ngưỡng 85' });
    const back = resultOf<{ version: number }>(await mockTransport.action('agent.rollback', { agent_id: created.agent_id, version: 1 }));
    expect(back.version).toBe(3);
    const a = await mockTransport.get<{ threshold: number }>(`/agents/${created.agent_id}`);
    expect(a.threshold).toBe(70);
    expect((await mockTransport.get<{ data: unknown[] }>(`/agents/${created.agent_id}/versions`)).data).toHaveLength(3);
  });

  it('agent: vượt plan.max_agents → PLAN_LIMIT_REACHED; Sales không quản lý agent', async () => {
    for (let i = 0; i < 4; i++) await mockTransport.action('agent.create', { name: `A${i}` });
    await expect(mockTransport.action('agent.create', { name: 'thừa' })).rejects.toMatchObject({ error: { code: 'PLAN_LIMIT_REACHED' } });
    setMockRole('sales');
    await expect(mockTransport.action('agent.pause', { agent_id: 'ag_sales', paused: true })).rejects.toMatchObject({ status: 403 });
    expect((await mockTransport.get<Agents>('/agents')).data).toHaveLength(10);
  });

  it('tác vụ tự chủ: tạo → đứng đầu danh sách, tạm dừng', async () => {
    const r = resultOf<{ task_id: string }>(
      await mockTransport.action('ai_task.create', { name: 'Báo cáo tuần', goal: 'Tổng hợp đơn 7 ngày', trigger: 'manual', model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 2000 }),
    );
    await mockTransport.action('ai_task.pause', { task_id: r.task_id, paused: true });
    const t = await mockTransport.get<{ tasks: { id: string; active: boolean }[] }>('/ai-tasks');
    expect(t.tasks[0]).toMatchObject({ id: r.task_id, active: false });
  });
});
