// Outbox relay (events/outbox.md §2, worker ROLE=jobs): drain workspace trong outbox:dirty → publish → published;
// lỗi retry back-off 2^n giây, tối đa 8 lần rồi failed. Sweep toàn bộ DB làm lưới an toàn (gọi định kỳ 10 phút).
// TIP-003b §3.4: mỗi lượt CLAIM có fence (claim.ts) — nhiều tiến trình relay không ghi đè thành công của nhau, claim hết lease được
// nhận lại. Event v2: job chỉ mang id (consumer đọc lại hàng có thẩm quyền), jobId theo generation để job cũ còn giữ không nuốt lần
// đánh thức cần thiết; event v1 giữ nguyên hành vi (payload + jobId = id).
import { TenantContexts, WorkspaceNotFoundError, type TenantDbResolver, type WorkspaceRegistry } from '@appchat/db';
import type { Clock } from '../clock';
import type { KeyValueStore } from '../redis';
import { appMetrics } from '../metrics/registry';
import { OUTBOX_DIRTY } from './outbox';
import { MAX_RELAY_ATTEMPTS, claimDue, markFailed, markPublished } from './claim';

export const MAX_ATTEMPTS = MAX_RELAY_ATTEMPTS;

export interface PublishedEvent {
  id: string;
  topic: string;
  /** v1: payload đi theo job. v2: null — consumer nạp lại hàng có thẩm quyền. */
  payload: unknown;
  workspaceId: string;
  traceId: string | null;
  protocolVersion?: 2;
  /** v2: jobId = `${id}-g${generation}` (đánh thức, không phải id hiệu ứng). */
  generation?: number;
  /** Khoá đánh thức tường minh (khôi phục dispatch) — ưu tiên hơn generation. */
  wakeKey?: string;
}

export interface EventPublisher {
  /** Publish sang queue `events`. v1 jobId = event id (không trùng khi relay chạy lại); v2 jobId theo generation. */
  publish(e: PublishedEvent): Promise<void>;
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
  /** Claim đã bị tiến trình khác lấy lại khi CAS — không ghi đè. */
  stale?: number;
}

export async function drainWorkspace(d: RelayDeps, workspaceId: string): Promise<DrainResult> {
  const db = await d.resolver.get(TenantContexts.system(workspaceId, 'outbox-relay'));
  const now = d.clock.now();
  const rows = await claimDue(db, now, d.batch);
  const res: DrainResult = { published: 0, retried: 0, failed: 0 };
  // outbox_lag_seconds (TIP-045b): tuổi event cũ nhất của lượt drain — gauge của tiến trình, không nhãn workspace.
  const oldest = rows.reduce<Date | null>((m, r) => (!m || r.createdAt < m ? r.createdAt : m), null);
  if (oldest) appMetrics().outboxLag.set(Math.max(0, (now.getTime() - oldest.getTime()) / 1000));
  for (const e of rows) {
    const v2 = e.protocolVersion === 2;
    try {
      await d.publisher.publish(v2 ? { id: e.id, topic: e.topic, payload: null, workspaceId, traceId: e.traceId, protocolVersion: 2, generation: e.generation } : { id: e.id, topic: e.topic, payload: e.payload, workspaceId, traceId: e.traceId });
      if (await markPublished(db, e)) res.published++;
      else res.stale = (res.stale ?? 0) + 1;
    } catch (err) {
      const r = await markFailed(db, e, (err as Error).message ?? 'publish_failed', now);
      if (r === 'failed') res.failed++;
      else if (r === 'retry') res.retried++;
      else res.stale = (res.stale ?? 0) + 1;
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
