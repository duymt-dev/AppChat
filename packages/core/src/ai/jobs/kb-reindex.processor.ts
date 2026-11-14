// Worker ROLE=ai: processor queue `kb-reindex` (TIP-020e §2.3, AC10). Mỗi job = một lượt `runGeneration` dưới lease (token mới mỗi lượt):
// tiếp từ cursor bền, không embed lại lô đã ghi. Drain (tắt tiến trình / 045b): ngừng nhận lô mới — lô đang chạy ghi xong rồi nhả lease,
// cursor giữ nguyên; quét khôi phục (lease hết hạn) đẩy lại job. Workspace tạm dừng / lưu trữ (041) → dừng, giữ cursor. Job `purge` dọn
// khe đích của generation đã huỷ / thay thế. Đồng thời 1 job / tiến trình (embed tốn mạng + ví — tuần tự theo lô).
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Embedder } from '@appchat/ai';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { Worker } from '../../kernel/jobs/with-job-context';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty } from '../../kernel/outbox/outbox';
import type { ReindexMeter } from '../kb/reindex/reindex-usage';
import { purgeGeneration, runGeneration } from '../kb/reindex/reindex.service';
import { KB_REINDEX_QUEUE, type KbReindexJob } from '../kb/reindex/reindex.queue';

export interface KbReindexWorkerDeps {
  tenants: TenantDbResolver;
  embedder: Embedder | null;
  meter: ReindexMeter | null;
  now: () => Date;
  log: AppLogger;
  /** Workspace còn hoạt động (041) — vắng = coi như mở. */
  isOpen?: (ws: string) => Promise<boolean>;
}

export interface KbReindexWorker {
  worker: Worker<KbReindexJob>;
  /** Drain: ngừng nhận lô mới; `close` chờ lô đang chạy xong. */
  draining(): boolean;
  close(): Promise<void>;
}

export function startKbReindexWorker(redis: Redis, d: KbReindexWorkerDeps): KbReindexWorker {
  let drain = false;
  const worker = new Worker<KbReindexJob>(
    KB_REINDEX_QUEUE,
    async (job) => {
      const { ws, generation_id } = job.data;
      const db = await d.tenants.get(TenantContexts.system(ws, 'kb-reindex'));
      if (job.data.op === 'purge') return { purged: await purgeGeneration(db, generation_id) };
      const out = await runGeneration(db, ws, generation_id, randomUUID(), {
        embedder: d.embedder,
        meter: d.meter,
        now: d.now,
        draining: () => drain,
        ...(d.isOpen ? { active: () => d.isOpen!(ws) } : {}),
        dirty: () => markDirty(redis, ws),
      });
      // Log chỉ id + trạng thái (không nội dung đoạn / tên model).
      if (out.status === 'failed') d.log.warn({ ws, generation: generation_id, reason: out.reason }, 'kb-reindex failed');
      return out;
    },
    { connection: redis.duplicate(), concurrency: 1 },
  );
  worker.on('error', (err) => d.log.warn({ err }, 'kb-reindex worker error'));
  return {
    worker,
    draining: () => drain,
    async close() {
      drain = true;
      await worker.close();
    },
  };
}
