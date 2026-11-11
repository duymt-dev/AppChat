// TIP-006b §2.1, §5.1 (đơn vị): mốc snapshot theo occurred_at; nhận một mục fanout — tác vụ tắt / đổi sự kiện → disabled, thế hệ trigger
// khác thế hệ đã chụp lúc chọn → superseded, đang có lượt sống → busy (không chồng lượt), còn lại → run + ý định; mục đã có kết cục →
// duplicate (không đọc tác vụ). Đường Postgres thật: apps/worker/test/integration/ai-task-event-recovery.test.ts, apps/api task-fanout.
import { describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { admitEventItem } from '../src/ai/tasks/event-admission';
import { cutoffOf } from '../src/ai/tasks/event-fanout';
import { LIVE_RUN } from '../src/ai/tasks/occurrence';

const T = '0196f012-0000-7000-8000-0000000a0001';
const E = { id: '0196f012-0000-7000-8000-0000000e0001', topic: 'order.completed' };
const task = (o: Record<string, unknown> = {}) => ({ id: T, name: 'n', status: 'active', trigger: 'event', eventType: E.topic, deletedAt: null, triggerGeneration: 3, createdByUserId: 'u', agentId: 'a', modelTier: 'standard', creditLimitPerRun: 10, ...o });

function fake(o: { pending?: boolean; task?: unknown; live?: number }) {
  const raw: string[] = [];
  const tx = {
    $queryRaw: vi.fn(async (s: TemplateStringsArray) => (s.join('?').includes('event_fanout_item') && s.join('?').includes('FOR UPDATE OF i') ? [{ phase: o.pending === false ? 'applied' : 'pending' }] : [])),
    $executeRaw: vi.fn(async (s: TemplateStringsArray) => (raw.push(s.join('?')), 1)),
    aiTask: { findUnique: vi.fn(async () => o.task ?? null) },
    aiRun: { count: vi.fn(async () => o.live ?? 0), create: vi.fn(async (q: { data: { id: string } }) => q.data), findUnique: vi.fn(async () => null) },
  };
  return { db: { $transaction: async <R>(fn: (t: typeof tx) => Promise<R>) => fn(tx) } as unknown as TenantDb, tx, raw };
}
const item = (version = '3') => ({ kind: 'ai_task', id: T, version, ordinal: 1 });
const now = () => new Date('2026-11-11T02:00:00Z');

describe('cutoffOf', () => {
  it('mốc = occurred_at hợp lệ, sai → giờ hiện tại', () => {
    expect(cutoffOf({ ...E, payload: { occurred_at: '2026-11-11T01:00:00.000Z' } }, now()).toISOString()).toBe('2026-11-11T01:00:00.000Z');
    expect(cutoffOf({ ...E, payload: { occurred_at: 'x' } }, now())).toEqual(now());
  });
});

describe('admitEventItem', () => {
  it('đủ điều kiện → run + ý định đẩy + occurrence handed_off + kết cục mục cùng transaction', async () => {
    const { db, raw } = fake({ task: task() });
    const r = await admitEventItem(db, 'f', item(), E, now);
    expect(r.outcome).toBe('queued');
    expect(r.runId).toEqual(expect.any(String));
    expect(raw.some((s) => s.includes('INSERT INTO task_dispatch_intent'))).toBe(true);
    expect(raw.some((s) => s.includes('INSERT INTO task_occurrence'))).toBe(true);
    expect(raw.some((s) => s.includes('UPDATE event_fanout_item'))).toBe(true);
  });

  it('thế hệ trigger đổi sau lúc chọn → superseded; tắt / đổi sự kiện → disabled; có lượt sống → busy', async () => {
    expect((await admitEventItem(fake({ task: task() }).db, 'f', item('2'), E, now)).outcome).toBe('skipped_disabled');
    expect((await admitEventItem(fake({ task: task({ status: 'paused' }) }).db, 'f', item(), E, now)).outcome).toBe('skipped_disabled');
    expect((await admitEventItem(fake({ task: task({ eventType: 'order.created' }) }).db, 'f', item(), E, now)).outcome).toBe('skipped_disabled');
    const busy = fake({ task: task(), live: 1 });
    expect((await admitEventItem(busy.db, 'f', item(), E, now)).outcome).toBe('skipped_busy');
    expect(busy.raw.some((s) => s.includes('task_dispatch_intent'))).toBe(false);
  });

  it('mục đã có kết cục → duplicate, không đọc tác vụ; LIVE_RUN gồm mọi trạng thái chờ của 019b', async () => {
    const f = fake({ pending: false, task: task() });
    expect((await admitEventItem(f.db, 'f', item(), E, now)).outcome).toBe('duplicate');
    expect(f.tx.aiTask.findUnique).not.toHaveBeenCalled();
    expect(LIVE_RUN).toEqual(expect.arrayContaining(['queued', 'running', 'waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage']));
  });
});
