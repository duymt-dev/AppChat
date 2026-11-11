// Worker ROLE=ai cho tệp đầu vào Trợ lý (TIP-023f §1.5): job `prepare` (một artifact), lịch `recover` mỗi phút (quét hàng chờ / lease
// hết hạn của workspace đã đánh dấu — sống sót khi job Redis mất) và `purge` mỗi giờ (nháp bỏ dở 24h). Đồng thời tối đa 2 / worker;
// mỗi workspace một tệp một lúc (khoá Redis ngắn) để một tenant không chiếm hết bộ parse.
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../../kernel/jobs/with-job-context';
import type { AppLogger } from '../../../kernel/logger/logger';
import type { Storage } from '../../../kernel/files/storage';
import { prepareArtifact } from './prepare';
import { INPUT_ARMED_KEY, INPUT_QUEUE, type InputJob } from './queue';
import { pendingWork, purgeAbandoned } from './recovery';
import type { SandboxConfig } from './sandbox';

const RECOVER_EVERY_MS = 60_000;
const PURGE_EVERY_MS = 3_600_000;
const TENANT_SLOT_MS = 45_000;

export interface InputWorkerDeps {
  tenants: TenantDbResolver;
  storage: Storage;
  sandbox: SandboxConfig;
  now: () => Date;
  log: AppLogger;
}

export async function startAssistantInputWorker(redis: Redis, d: InputWorkerDeps): Promise<{ close(): Promise<void> }> {
  const owner = `worker-${randomUUID()}`;
  const sched = new Queue<InputJob>(INPUT_QUEUE, { connection: redis.duplicate() });
  await sched.upsertJobScheduler('recover', { every: RECOVER_EVERY_MS }, { name: 'recover', data: { ws: '' } });
  await sched.upsertJobScheduler('purge', { every: PURGE_EVERY_MS }, { name: 'purge', data: { ws: '' } });
  const tenant = (ws: string) => d.tenants.get(TenantContexts.system(ws, 'assistant-input'));
  const prepareOne = async (ws: string, id: string) => {
    const slot = `assistant-input:slot:${ws}`;
    if ((await redis.set(slot, owner, 'PX', TENANT_SLOT_MS, 'NX')) !== 'OK') return 'busy';
    try {
      return await prepareArtifact(await tenant(ws), id, { storage: d.storage, sandbox: d.sandbox, now: d.now, owner });
    } finally {
      if ((await redis.get(slot)) === owner) await redis.del(slot);
    }
  };
  const w = new Worker<InputJob>(
    INPUT_QUEUE,
    async (job) => {
      if (job.name === 'prepare' && job.data.artifact_id) {
        const r = await prepareOne(job.data.ws, job.data.artifact_id);
        // Workspace đang bận tệp khác → để lần quét kế nhận (hàng vẫn queued), không lỗi job.
        return r;
      }
      for (const ws of await redis.smembers(INPUT_ARMED_KEY)) {
        try {
          const db = await tenant(ws);
          if (job.name === 'purge') await purgeAbandoned(db, d.now());
          else for (const id of await pendingWork(db, d.now())) await prepareOne(ws, id);
          if (job.name === 'purge' && !(await db.assistantInputArtifact.count({ where: { phase: { in: ['queued', 'preparing'] } } })) && !(await db.assistantInputArtifact.count({ where: { sessionId: null, phase: { not: 'cancelled' } } }))) await redis.srem(INPUT_ARMED_KEY, ws);
        } catch (err) {
          d.log.warn({ err, ws }, `assistant-input ${job.name} lỗi`);
        }
      }
      return 'scanned';
    },
    { connection: redis.duplicate(), concurrency: 2 },
  );
  w.on('error', (err) => d.log.warn({ err }, 'assistant-input worker error'));
  return {
    async close() {
      await w.close();
      await sched.close();
    },
  };
}
