// TIP-041 pha 2 — đơn vị: sự kiện hoạt động của executor, consumer mốc hoạt động, ngữ cảnh lệnh vòng đời (chỉ dựng phía server), ngày
// lưu trữ dự kiến. Phần đụng DB thật (GREATEST, quét, khôi phục) ở apps/api/test/integration/workspace-lifecycle-activity.test.ts.
import { describe, expect, it, vi } from 'vitest';
import { activityEvent } from '../src/kernel/actions/activity-event';
import { isTrustedLifecycleContext, lifecycleContext, LIFECYCLE_ACTIONS } from '../src/kernel/actions/workspace-lifecycle-context';
import { activityConsumer, occurredAt } from '../src/identity/lifecycle/activity';
import { archiveOn } from '../src/identity/lifecycle/archive-scan';

const WS = '0190f000-0000-7000-8000-00000000c041';

describe('activityEvent', () => {
  it('action người / Trợ lý ghi → một sự kiện chỉ id + nguồn; system / đọc → không', () => {
    const user = { source: 'ui' as const, actor: { type: 'user' as const, id: 'u1' } };
    expect(activityEvent(user, { risk: 'write' }, 'log1')).toEqual([{ topic: 'workspace.activity', payload: { action_log_id: 'log1', source: 'ui', actor_type: 'user' } }]);
    expect(activityEvent(user, { risk: 'read' }, 'log1')).toEqual([]);
    expect(activityEvent({ source: 'system', actor: { type: 'system', id: 'job' } }, { risk: 'write' }, 'log1')).toEqual([]);
    expect(activityEvent({ source: 'api', actor: { type: 'system', id: 'job' } }, { risk: 'config' }, 'log1')).toEqual([]);
  });
});

describe('consumer lifecycle.activity', () => {
  it('đẩy mốc theo occurred_at gốc; thiếu / sai mốc → không ghi', async () => {
    const exec = vi.fn(async () => 1);
    const c = activityConsumer({ $executeRaw: exec } as never);
    expect(c.topics).toEqual(['message.received', 'message.sent', 'workspace.activity']);
    const e = (payload: Record<string, unknown>) => ({ id: 'e1', topic: 'workspace.activity', workspaceId: WS, payload, traceId: null });
    await c.handle(e({ occurred_at: '2026-11-01T10:00:00.000Z' }), {} as never);
    expect(exec).toHaveBeenCalledOnce();
    await c.handle(e({}), {} as never);
    await c.handle(e({ occurred_at: 'không phải ngày' }), {} as never);
    expect(exec).toHaveBeenCalledOnce();
    expect(occurredAt(e({ occurred_at: 42 }))).toBeNull();
  });
});

describe('ngữ cảnh lệnh vòng đời', () => {
  it('đúng 4 lệnh vòng đời (open + vùng nguy hiểm Owner); ngữ cảnh tự dựng (không qua lifecycleContext) không được tin', () => {
    expect([...LIFECYCLE_ACTIONS]).toEqual(['workspace.open', 'workspace.delete_challenge', 'workspace.delete', 'workspace.freeze_request']);
    const ctx = lifecycleContext('u1', WS, { idempotencyKey: 'k' });
    expect(isTrustedLifecycleContext(ctx)).toBe(true);
    expect(isTrustedLifecycleContext({ ...ctx })).toBe(false);
    expect(isTrustedLifecycleContext({ actor: { type: 'user', id: 'u1' }, workspaceId: WS })).toBe(false);
  });
});

describe('archiveOn', () => {
  it('mốc hoạt động + ngưỡng ngày, làm tròn về 00:00 UTC', () => {
    expect(archiveOn(new Date('2026-08-01T15:30:00Z'), 90).toISOString()).toBe('2026-10-30T00:00:00.000Z');
  });
});
