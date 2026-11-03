// Worker ROLE=ai: job lịch của lượt Trợ lý (TIP-023c SPEC vận hành + "Fenced recovery") — `assistant-events.prune` mỗi 15 phút dọn sự
// kiện stream quá 24h (genui/prune-events.ts); `assistant-turns.recover` mỗi phút chốt lượt mồ côi có lease hết hạn (genui/recovery.ts).
// Chỉ workspace đã đánh dấu; scheduler upsert idempotent, concurrency 1; giờ theo Clock.
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { EVENTS_ARMED_KEY, EVENTS_PRUNE_EVERY_MS, pruneArmedEvents } from '../assistant/genui/prune-events';
import { ASSISTANT_ARMED_KEY, RECOVERY_EVERY_MS, recoverArmedTurns } from '../assistant/genui/recovery';

export const ASSISTANT_EVENTS_QUEUE = 'assistant-events';
export const ASSISTANT_EVENTS_PRUNE_JOB = 'assistant-events.prune';
export const ASSISTANT_TURNS_RECOVER_JOB = 'assistant-turns.recover';

export async function startAssistantEventsPrune(redis: Redis, tenants: TenantDbResolver, now: () => Date, log: AppLogger): Promise<{ close(): Promise<void> }> {
  const sched = new Queue(ASSISTANT_EVENTS_QUEUE, { connection: redis.duplicate() });
  await sched.upsertJobScheduler(ASSISTANT_EVENTS_PRUNE_JOB, { every: EVENTS_PRUNE_EVERY_MS }, { name: ASSISTANT_EVENTS_PRUNE_JOB });
  await sched.upsertJobScheduler(ASSISTANT_TURNS_RECOVER_JOB, { every: RECOVERY_EVERY_MS }, { name: ASSISTANT_TURNS_RECOVER_JOB });
  const armedOf = (key: string) => ({ list: () => redis.smembers(key), remove: async (ws: string) => void (await redis.srem(key, ws)) });
  const tenant = (ws: string) => tenants.get(TenantContexts.system(ws, 'assistant-events'));
  const warn = (what: string) => (ws: string, err: unknown) => log.warn({ err, ws }, `${what} lỗi`);
  const w = new Worker(
    ASSISTANT_EVENTS_QUEUE,
    (job) =>
      job.name === ASSISTANT_TURNS_RECOVER_JOB
        ? recoverArmedTurns({ now, pub: redis }, armedOf(ASSISTANT_ARMED_KEY), tenant, warn('assistant-turns recover'))
        : pruneArmedEvents(armedOf(EVENTS_ARMED_KEY), tenant, now, warn('assistant-events prune')),
    { connection: redis.duplicate(), concurrency: 1 },
  );
  w.on('error', (err) => log.warn({ err }, 'assistant-events worker error'));
  return {
    async close() {
      await w.close();
      await sched.close();
    },
  };
}
