// Outbox relay (events/outbox.md §2, worker ROLE=jobs): drain workspace trong outbox:dirty → publish → published;
// lỗi retry back-off 2^n giây, tối đa 8 lần rồi failed. Sweep toàn bộ DB làm lưới an toàn (gọi định kỳ 10 phút).
import { TenantContexts, WorkspaceNotFoundError, type TenantDbResolver, type WorkspaceRegistry } from '@appchat/db';
import type { Clock } from '../clock';
import type { KeyValueStore } from '../redis';
import { appMetrics } from '../metrics/registry';
import { OUTBOX_DIRTY } from './outbox';

export const MAX_ATTEMPTS = 8;

export interface EventPublisher {
  /** Publish sang queue `events`; jobId = event id để không trùng khi relay chạy lại. */
  publish(e: { id: string; topic: string; payload: unknown; workspaceId: string; traceId: string | null }): Promise<void>;
}

export interface RelayDeps {
  resolver: TenantDbResolver;
  registry: WorkspaceRegistry;
  kv: KeyValueStore;
  publisher: EventPublisher;
  clock: Clock;
  batch?: number;
}

export interface DrainResult {
  published: number;
  retried: number;
  failed: number;
}

export async function drainWorkspace(d: RelayDeps, workspaceId: string): Promise<DrainResult> {
  const db = await d.resolver.get(TenantContexts.system(workspaceId, 'outbox-relay'));
  const now = d.clock.now();
  const rows = await db.outboxEvent.findMany({
    where: { status: 'pending', availableAt: { lte: now } },
    orderBy: { availableAt: 'asc' },
    take: d.batch ?? 200,
  });
  const res: DrainResult = { published: 0, retried: 0, failed: 0 };
  // outbox_lag_seconds (TIP-045b): tuổi event cũ nhất của lượt drain — gauge của tiến trình, không nhãn workspace.
  if (rows[0]) appMetrics().outboxLag.set(Math.max(0, (now.getTime() - rows[0].createdAt.getTime()) / 1000));
  for (const e of rows) {
    try {
      await d.publisher.publish({ id: e.id, topic: e.topic, payload: e.payload, workspaceId, traceId: e.traceId });
      await db.outboxEvent.updateMany({ where: { id: e.id, status: 'pending' }, data: { status: 'published', attempts: e.attempts + 1 } });
      res.published++;
    } catch (err) {
      const attempts = e.attempts + 1;
      const dead = attempts >= MAX_ATTEMPTS;
      await db.outboxEvent.update({
        where: { id: e.id },
        data: {
          attempts,
          status: dead ? 'failed' : 'pending',
          availableAt: new Date(now.getTime() + 2 ** attempts * 1000),
          lastError: (err as Error).message.slice(0, 500),
        },
      });
      if (dead) res.failed++;
      else res.retried++;
    }
  }
  return res;
}

/**
 * Lấy workspace bẩn ra khỏi set và drain từng cái; lỗi một workspace → trả lại set để lần sau thử. Workspace không còn (đã xoá)
 * thì bỏ hẳn — trả lại sẽ kẹt trong set mãi và chiếm chỗ của workspace thật trong mỗi lượt `max`.
 */
export async function drainDirty(d: RelayDeps, max = 50): Promise<Record<string, DrainResult>> {
  const ids = await d.kv.spop(OUTBOX_DIRTY, max);
  const out: Record<string, DrainResult> = {};
  for (const ws of ids) {
    try {
      out[ws] = await drainWorkspace(d, ws);
    } catch (err) {
      if (!(err instanceof WorkspaceNotFoundError)) await d.kv.sadd(OUTBOX_DIRTY, ws);
    }
  }
  return out;
}

/** Lưới an toàn 10 phút: duyệt mọi workspace migratable (active / suspended) — chỉ active mới resolve được. */
export async function sweepAll(d: RelayDeps): Promise<number> {
  let n = 0;
  for (const w of await d.registry.listMigratable()) {
    if (w.dbStatus !== 'active') continue;
    n += (await drainWorkspace(d, w.workspaceId)).published;
  }
  return n;
}
