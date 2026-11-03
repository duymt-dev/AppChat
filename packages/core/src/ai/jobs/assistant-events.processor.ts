// Worker ROLE=ai: job lịch `assistant-events.prune` (TIP-023c SPEC vận hành) — mỗi 15 phút dọn sự kiện stream Trợ lý quá 24h ở các
// workspace đã đánh dấu (genui/prune-events.ts). Một scheduler (upsert idempotent), concurrency 1; giờ theo Clock.
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { EVENTS_ARMED_KEY, EVENTS_PRUNE_EVERY_MS, pruneArmedEvents } from '../assistant/genui/prune-events';

export const ASSISTANT_EVENTS_QUEUE = 'assistant-events';
export const ASSISTANT_EVENTS_PRUNE_JOB = 'assistant-events.prune';

export async function startAssistantEventsPrune(redis: Redis, tenants: TenantDbResolver, now: () => Date, log: AppLogger): Promise<{ close(): Promise<void> }> {
  const sched = new Queue(ASSISTANT_EVENTS_QUEUE, { connection: redis.duplicate() });
  await sched.upsertJobScheduler(ASSISTANT_EVENTS_PRUNE_JOB, { every: EVENTS_PRUNE_EVERY_MS }, { name: ASSISTANT_EVENTS_PRUNE_JOB });
  const armed = { list: () => redis.smembers(EVENTS_ARMED_KEY), remove: async (ws: string) => void (await redis.srem(EVENTS_ARMED_KEY, ws)) };
  const tenant = (ws: string) => tenants.get(TenantContexts.system(ws, 'assistant-events'));
  const w = new Worker(ASSISTANT_EVENTS_QUEUE, () => pruneArmedEvents(armed, tenant, now, (ws, err) => log.warn({ err, ws }, 'assistant-events prune lỗi')), { connection: redis.duplicate(), concurrency: 1 });
  w.on('error', (err) => log.warn({ err }, 'assistant-events worker error'));
  return {
    async close() {
      await w.close();
      await sched.close();
    },
  };
}
