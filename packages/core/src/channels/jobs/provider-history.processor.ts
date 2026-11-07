// Chạy lần lấy lịch sử trên worker giữ phiên (TIP-014b C). Job `history` đi chung hàng đợi thao tác `chop-<tài khoản>` (mở / đóng cùng phiên,
// concurrency 1 → không chồng với thu hồi / cảm xúc). Consumer outbox `channel.history_requested` đẩy job; worker giành lần chạy (queued →
// running + thế hệ), gọi `adapter.fetchHistory` — mỗi lô lưu bền xong mới lấy trang sau — rồi ghi báo cáo. Lỗi lưu → failed (không nuốt).
// Job chạy lại khi lần đã `running` (sập giữa chừng) → partial `interrupted`, không chạy chồng.
import type { ChannelAdapter } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { HISTORY_LIMITS, claimHistory, finishHistory, ingestHistoryBatch } from '../operations/history-run';
import type { HistoryJob, HistoryPipeline } from '../operations/types';

export type { HistoryJob };

export interface HistoryDeps {
  tenants: TenantDbResolver;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
  /** Pipeline tin vào (inbox) — đăng ký khi InboxJobsModule chạy cùng tiến trình; vắng → lần chạy failed (không mất tin im lặng). */
  pipeline: () => HistoryPipeline | null;
  limits?: Partial<typeof HISTORY_LIMITS>;
}

let PIPELINE: HistoryPipeline | null = null;
/** Inbox đăng ký pipeline cho lịch sử (channels không import inbox). */
export const registerHistoryPipeline = (p: HistoryPipeline | null) => void (PIPELINE = p);
export const historyPipeline = () => PIPELINE;

export async function runHistory(d: HistoryDeps, accountId: string, adapter: ChannelAdapter, j: HistoryJob, generation?: number): Promise<string> {
  const db = await d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
  const run = await claimHistory(db, j.history_run_id, accountId, generation, d.now());
  if (!run) return 'skipped';
  const pipeline = d.pipeline();
  if (!adapter.fetchHistory || !pipeline) {
    await finishHistory(db, run.id, { error: adapter.fetchHistory ? 'pipeline_unavailable' : 'history_unsupported' }, d.now());
    return 'failed';
  }
  const lim = { ...HISTORY_LIMITS, ...d.limits };
  try {
    const report = await adapter.fetchHistory(accountId, { cutoffAt: run.cutoffAt.toISOString(), ...lim }, async (batch) => {
      if (await ingestHistoryBatch(db, j.ws, pipeline, run.id, batch, d.now())) await markDirty(d.kv, j.ws);
    });
    await finishHistory(db, run.id, report, d.now());
    return report.status;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'history_failed';
    d.log.warn({ account: accountId, run: run.id, err: msg }, 'channel history run failed');
    await finishHistory(db, run.id, { error: msg }, d.now());
    return 'failed';
  }
}

/** Consumer outbox `channel.history_requested`: đẩy job vào hàng đợi thao tác của đúng tài khoản. */
export function historyRequestConsumer(q: { enqueueHistory(accountId: string, j: HistoryJob): Promise<void> }): EventConsumer {
  return {
    name: 'channels.history_request',
    topics: ['channel.history_requested'],
    async handle(e, db) {
      const id = String(e.payload.run_id ?? '');
      const run = await db.channelHistoryRun.findUnique({ where: { id }, select: { id: true, channelAccountId: true, status: true } });
      if (!run || run.status !== 'queued') return;
      await q.enqueueHistory(run.channelAccountId, { ws: e.workspaceId, history_run_id: run.id });
    },
  };
}
