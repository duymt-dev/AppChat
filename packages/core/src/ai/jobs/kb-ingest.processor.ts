// Worker ROLE=ai: processor queue `kb-ingest` (rag §5) → ingestSource trên DB tenant của workspace trong job. Đồng thời 2 job / process
// (parse + embed tốn CPU / mạng). Event `kb.source_ready` / `kb.source_failed` ghi cùng transaction → đánh dấu bẩn cho outbox relay.
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty } from '../../kernel/outbox/outbox';
import { KB_INGEST_QUEUE, ingestSource, type IngestDeps, type KbIngestJob } from '../kb/ingest';

export function startKbIngestWorker(redis: Redis, tenants: TenantDbResolver, deps: Omit<IngestDeps, 'dirty'>, log: AppLogger): Worker<KbIngestJob> {
  const w = new Worker<KbIngestJob>(
    KB_INGEST_QUEUE,
    async (job) => {
      const { ws, source_id } = job.data;
      const db = await tenants.get(TenantContexts.system(ws, 'kb-ingest'));
      return ingestSource(db, ws, source_id, { ...deps, dirty: (id) => markDirty(redis, id) });
    },
    { connection: redis.duplicate(), concurrency: 2 },
  );
  w.on('error', (err) => log.warn({ err }, 'kb-ingest worker error'));
  return w;
}
