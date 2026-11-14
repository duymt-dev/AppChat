// Queue `doc-render` (Blueprint §2.4, D30 — worker ROLE=jobs, 2 việc cùng lúc, LibreOffice ≤ 60 giây mỗi lượt — DV-007). Đánh thức: outbox
// `document.render_requested` → consumer `documents.render` đẩy job `render-<id>-<thế hệ>` (relay chạy lại / bấm Thử lại hai lần không
// nhân đôi); job lỗi thử lại tối đa 3 lần (back-off mũ) rồi `render_failed`. Vòng quét mỗi phút đẩy lại dòng `pending_render` đứng yên
// > 2 phút (mất Redis lúc đẩy / worker chết giữa chừng — AC2) — cùng jobId nên không chạy song song với job đang sống.
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import { RENDER_CONCURRENCY } from '../services/doc-renderer';
import { RENDER_ATTEMPTS, runRender, type RenderJob, type RenderRunResult } from '../render/runner';

export const DOC_RENDER_QUEUE = 'doc-render';
export const DOC_RENDER_CONSUMER = 'documents.render';
export const DOC_RENDER_SWEEP_JOB = 'doc-render.sweep';
export const SWEEP_EVERY_MS = 60_000;
const STALE_MS = 2 * 60_000;

/** Tên job BullMQ không được chứa ':' — id render + thế hệ. */
export const renderJobId = (renderId: string, generation: number) => `render-${renderId}-${generation}`;

export class DocRenderQueue {
  private readonly q: Queue<RenderJob>;

  constructor(redis: Redis) {
    this.q = new Queue<RenderJob>(DOC_RENDER_QUEUE, { connection: redis.duplicate() });
  }

  async push(j: RenderJob): Promise<void> {
    await this.q.add('render', j, { jobId: renderJobId(j.render_id, j.generation), attempts: RENDER_ATTEMPTS, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  async scheduleSweep(): Promise<void> {
    await this.q.upsertJobScheduler(DOC_RENDER_SWEEP_JOB, { every: SWEEP_EVERY_MS }, { name: DOC_RENDER_SWEEP_JOB });
  }

  close(): Promise<void> {
    return this.q.close();
  }
}

export function docRenderConsumer(queue: Pick<DocRenderQueue, 'push'>): EventConsumer {
  return {
    name: DOC_RENDER_CONSUMER,
    topics: ['document.render_requested'],
    async handle(e) {
      const id = e.payload.render_id;
      if (typeof id === 'string' && id) await queue.push({ ws: e.workspaceId, render_id: id, generation: Number(e.payload.generation ?? 1) });
    },
  };
}

/** Đẩy lại việc đứng yên (index partial `document_render_pending_idx`). Lỗi một workspace không chặn workspace khác. */
export async function sweepPendingRenders(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; queue: Pick<DocRenderQueue, 'push'>; now: () => Date; onError?: (ws: string, err: unknown) => void }): Promise<number> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const before = new Date(d.now().getTime() - STALE_MS);
  let pushed = 0;
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, DOC_RENDER_SWEEP_JOB));
      const rows = await db.documentRender.findMany({ where: { status: 'pending_render', updatedAt: { lt: before } }, orderBy: { updatedAt: 'asc' }, take: 100, select: { id: true, generation: true } });
      for (const r of rows) await d.queue.push({ ws: w.id, render_id: r.id, generation: r.generation });
      pushed += rows.length;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return pushed;
}

export interface DocRenderWorkerDeps {
  tenants: TenantDbResolver;
  now: () => Date;
  /** Sau commit: đẩy tin gửi khách vào hàng gửi kênh + đánh dấu outbox bẩn. */
  afterCommit: (ws: string, r: RenderRunResult) => Promise<void>;
  sweep: () => Promise<number>;
  log: AppLogger;
}

export function startDocRenderWorker(redis: Redis, d: DocRenderWorkerDeps): Worker<RenderJob> {
  const w = new Worker<RenderJob>(
    DOC_RENDER_QUEUE,
    async (job) => {
      if (job.name === DOC_RENDER_SWEEP_JOB) return { pushed: await d.sweep() };
      const db = await d.tenants.get(TenantContexts.system(job.data.ws, 'doc-render'));
      const r = await runRender(db, job.data, job.attemptsMade + 1, d.now);
      if (r.status !== 'skipped') await d.afterCommit(job.data.ws, r);
      return { status: r.status };
    },
    { connection: redis.duplicate(), concurrency: RENDER_CONCURRENCY },
  );
  w.on('failed', (job, err) => d.log.warn({ err, job: job?.name, attempt: job?.attemptsMade }, 'doc-render thử lại'));
  w.on('error', (err) => d.log.warn({ err }, 'doc-render worker error'));
  return w;
}
