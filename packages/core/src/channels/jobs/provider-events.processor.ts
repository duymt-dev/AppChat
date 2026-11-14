// Hàng đợi sự kiện kênh ngoài tin vào (TIP-014b A: self-listen / thu hồi / cảm xúc): adapter → `sink.event` → queue `channel-provider-event`
// (job id = tài khoản + key ổn định — chống trùng) → áp trong transaction tenant + outbox. Lỗi DB → BullMQ thử lại (không nuốt); sự kiện không
// khớp tin của tài khoản → bỏ qua (không tạo tin / khách). Consumer outbox `channel.operation_requested` đẩy lệnh vào hàng đợi của tài khoản.
import type { ProviderEvent } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { Redis } from 'ioredis';
import type { EventConsumer } from '../../kernel/events/consumer';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { applyProviderEvent } from '../operations/provider-event';
import type { OperationQueue } from './provider-operations.processor';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export const PROVIDER_EVENT_QUEUE = 'channel-provider-event';

export interface ProviderEventJob {
  ws: string;
  event: ProviderEvent;
}

export const providerEventJobId = (e: ProviderEvent) => `pe-${e.accountId}-${e.key}`.replace(/[:,]/g, '_').slice(0, 200);

/** Đẩy sự kiện kênh vào hàng đợi (sink của ChannelSessions). Lỗi Redis ném ra → adapter đếm `sinkErrors`. */
export async function enqueueProviderEvent(q: Pick<Queue, 'add'>, ws: string, e: ProviderEvent): Promise<void> {
  await q.add('event', { ws, event: e }, { jobId: providerEventJobId(e), attempts: 8, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 2000, removeOnFail: 5000 });
}

export function startProviderEventWorker(d: { redis: Redis; kv: KeyValueStore; tenants: TenantDbResolver; log: AppLogger; now: () => Date }): Worker<ProviderEventJob> {
  const w = new Worker<ProviderEventJob>(
    PROVIDER_EVENT_QUEUE,
    async (job) => {
      const { ws, event } = job.data;
      const db = await d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
      const now = d.now();
      const wrote = await inEventTransaction(db, ws, async (tx) => {
        // Tài khoản không thuộc workspace này / đã ngắt → bỏ qua (không áp sự kiện chéo tài khoản).
        const acc = await tx.channelAccount.findUnique({ where: { id: event.accountId }, select: { status: true } });
        if (!acc || acc.status === 'disconnected') return false;
        const events = await applyProviderEvent(tx, event, now);
        await writeOutbox(tx, ws, events, now);
        return events.length > 0;
      });
      if (wrote) await markDirty(d.kv, ws);
      return event.kind;
    },
    { connection: d.redis.duplicate(), concurrency: 4 },
  );
  w.on('error', (err) => d.log.warn({ err }, 'provider event worker error'));
  return w;
}

/** Consumer outbox `channel.operation_requested`: đẩy lệnh vào hàng đợi của đúng tài khoản (worker giữ lease của tài khoản mới mở). */
export function operationRequestConsumer(q: Pick<OperationQueue, 'enqueue'>): EventConsumer {
  return {
    name: 'channels.operation_request',
    topics: ['channel.operation_requested'],
    async handle(e, db) {
      const id = String(e.payload.operation_id ?? '');
      const op = await db.channelOperation.findUnique({ where: { id }, select: { id: true, channelAccountId: true, status: true } });
      if (!op || op.status !== 'queued') return;
      await q.enqueue(op.channelAccountId, { ws: e.workspaceId, operation_id: op.id });
    },
  };
}

export const providerEventQueue = (redis: Redis) => new Queue(PROVIDER_EVENT_QUEUE, { connection: redis.duplicate() });
