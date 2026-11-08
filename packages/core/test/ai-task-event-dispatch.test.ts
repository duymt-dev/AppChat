// TIP-012b P4 §3.5 (đơn vị, DB giả): phân trang tác vụ theo cursor (không cắt 100 im lặng), mốc snapshot = lúc sự kiện xảy ra, biên nhận
// trùng → duplicate không tạo run, không queue (worker API không có queue) vẫn ghi biên nhận để khôi phục đẩy sau. Đường Postgres thật:
// apps/worker/test/integration/ai-task-event-recovery.test.ts.
import { describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { LIVE_RUN, dispatchTaskEvent } from '../src/ai/tasks/event-dispatch';

const E = { id: '0196f012-0000-7000-8000-0000000e0001', topic: 'order.completed', workspaceId: 'w', payload: { occurred_at: '2026-11-08T01:00:00.000Z' }, traceId: null };

function fakeDb(taskCount: number, prior: Set<string> = new Set()) {
  const ids = Array.from({ length: taskCount }, (_, i) => `t${String(i).padStart(4, '0')}`);
  const findMany = vi.fn(async (q: { where: { id?: { gt: string }; createdAt: { lte: Date } }; take: number }) =>
    ids.filter((id) => !q.where.id || id > q.where.id.gt).slice(0, q.take).map((id) => ({ id })),
  );
  const created: { outcome: string }[] = [];
  const tx = {
    $queryRaw: async () => [],
    aiTaskEventReceipt: { findUnique: async (q: { where: { taskId_sourceEventId: { taskId: string } } }) => (prior.has(q.where.taskId_sourceEventId.taskId) ? { id: 'x' } : null), create: async (q: { data: { outcome: string } }) => void created.push(q.data) },
    aiTask: { findUnique: async (q: { where: { id: string } }) => ({ id: q.where.id, name: 'n', status: 'active', trigger: 'event', eventType: E.topic, deletedAt: null, createdByUserId: 'u', agentId: 'a', modelTier: 'standard', creditLimitPerRun: 10 }) },
    aiRun: { count: async () => 0, create: async (q: { data: { id: string } }) => q.data },
  };
  const db = { aiTask: { findMany }, $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx), aiTaskEventReceipt: { updateMany: async () => ({ count: 1 }) } };
  return { db: db as unknown as TenantDb, findMany, created };
}

describe('dispatchTaskEvent', () => {
  it('250 tác vụ → 3 trang cursor, đủ 250 biên nhận queued; mốc = occurred_at', async () => {
    const { db, findMany, created } = fakeDb(250);
    const r = await dispatchTaskEvent(db, null, 'w', E, () => new Date('2026-11-08T02:00:00Z'));
    expect(r.queued).toBe(250);
    expect(findMany).toHaveBeenCalledTimes(3);
    expect(findMany.mock.calls[0]![0].where.createdAt.lte.toISOString()).toBe('2026-11-08T01:00:00.000Z');
    expect(created.every((c) => c.outcome === 'queued')).toBe(true);
  });

  it('biên nhận đã có → duplicate, không tạo run; LIVE_RUN gồm mọi trạng thái chờ của 019b', async () => {
    const { db, created } = fakeDb(2, new Set(['t0000']));
    const r = await dispatchTaskEvent(db, null, 'w', E, () => new Date());
    expect([r.duplicate, r.queued, created.length]).toEqual([1, 1, 1]);
    expect(LIVE_RUN).toEqual(expect.arrayContaining(['queued', 'running', 'waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage']));
  });
});
