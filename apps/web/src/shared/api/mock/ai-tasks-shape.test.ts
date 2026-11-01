// TIP-035: route mock Tác vụ tự chủ đúng shape đọc dùng chung với API thật (packages/shared/src/api/ai-tasks.ts) + luật server
// (cron sai → 422, theo sự kiện thiếu topic → 422, mẫu chủ động mang cron / nhóm dữ liệu / công cụ, chạy ngay → run trong khung điều phối).
import { beforeEach, describe, expect, it } from 'vitest';
import { aiTasksPayloadSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createTasksState } from './domains/ai-tasks';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const base = { name: 'Báo cáo', goal: 'Tổng hợp', model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 2000 };
const fail = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return (e as { error?: { fields?: Record<string, string> } }).error?.fields ?? {};
  }
};

describe('mock tác vụ tự chủ — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().assistant.tasks = createTasksState();
    setMockRole('owner');
  });

  it('GET /ai-tasks khớp schema; 6 thẻ prototype + 6 chỉ số + mẫu chủ động + drawer theo tác vụ', async () => {
    const d = await mockTransport.get('/ai-tasks');
    expect(issues(aiTasksPayloadSchema.safeParse(d))).toEqual([]);
    const p = aiTasksPayloadSchema.parse(d);
    expect(p.tasks).toHaveLength(6);
    expect(p.templates.map((t) => t.template).filter(Boolean)).toEqual(['follow_up', 'stale_quote', 'appointment_reminder', 'aftercare', 'briefing']);
    expect(Object.keys(p.drawers)).toHaveLength(6);
  });

  it('luật: cron sai / sự kiện thiếu topic → 422; mẫu chủ động; chạy ngay; xoá', async () => {
    expect(await fail(mockTransport.action('ai_task.create', { ...base, trigger: 'schedule', cron: '99 * * * *' }))).toMatchObject({ cron: 'invalid' });
    expect(await fail(mockTransport.action('ai_task.create', { ...base, trigger: 'event' }))).toMatchObject({ event_type: 'required' });
    await mockTransport.action('ai_task.create', { ...base, trigger: 'schedule', template: 'follow_up' });
    const p = aiTasksPayloadSchema.parse(await mockTransport.get('/ai-tasks'));
    expect(p.tasks[0]).toMatchObject({ cron: '0 9 * * 1-6', data_scope: ['customers', 'conversations'], tools: ['read', 'message', 'report'], template: 'follow_up' });
    await mockTransport.action('ai_task.run_now', { task_id: p.tasks[0]!.id });
    expect((await mockTransport.get<{ data: { task: string }[] }>('/runs', { status: 'live' })).data[0]).toMatchObject({ task: 'Báo cáo' });
    await mockTransport.action('ai_task.delete', { task_id: p.tasks[0]!.id });
    expect(aiTasksPayloadSchema.parse(await mockTransport.get('/ai-tasks')).tasks).toHaveLength(6);
  });
});
