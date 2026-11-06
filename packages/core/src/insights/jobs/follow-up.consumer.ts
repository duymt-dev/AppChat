// Sweep việc follow (TIP-038 pha 2, DC-241) — ROLE=jobs: lịch `insights.follow-up-sweep` mỗi 15 phút trên queue riêng (jobId cố định → một
// lịch dù nhiều worker). Mỗi workspace đang hoạt động → action system-only `follow_up.reconcile` qua ActionExecutor (audit + transaction;
// lô bounded). Chạy lại / hai worker cùng lúc → `source_key` unique giữ một việc mỗi mốc. Không gửi tin.
// Lỗi một workspace (DB chưa nâng migration…) không chặn workspace khác. Không có Redis → không quét (không giả chạy).
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import { ActionExecutor } from '../../kernel/actions/executor';
import { CLOCK, type Clock } from '../../kernel/clock';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { FOLLOW_UP_ACTOR } from '../actions/follow-up.handlers';

export const INSIGHTS_SCHEDULER_QUEUE = 'insights-scheduler';
export const FOLLOW_UP_SWEEP_JOB = 'insights.follow-up-sweep';
const EVERY_MS = 15 * 60_000;

/** Không khoá idempotency: lượt quét tự idempotent (`source_key` unique, supersede có điều kiện) — chạy lại phải làm việc thật, không trả kết quả cũ. */
export const followUpCtx = (ws: string): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: FOLLOW_UP_ACTOR },
  authz: { isOwner: true } as never,
});

export interface SweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

/** Một lượt quét mọi workspace — trả tổng việc tạo / thay. */
export async function sweepFollowUps(d: SweepDeps): Promise<{ created: number; superseded: number }> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const batch = d.now().toISOString().slice(0, 16);
  const r = { created: 0, superseded: 0 };
  for (const w of wss) {
    try {
      const out = (await d.executor.execute(followUpCtx(w.id), 'follow_up.reconcile', { batch })) as { data?: { result?: { created?: number; superseded?: number } } };
      r.created += out.data?.result?.created ?? 0;
      r.superseded += out.data?.result?.superseded ?? 0;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return r;
}

export class FollowUpSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.executor) return;
    const deps: SweepDeps = { platform: this.platform, executor: this.executor, now: () => this.clock.now(), onError: (ws, err) => this.log.warn({ err, ws, job: FOLLOW_UP_SWEEP_JOB }, 'quét việc follow lỗi ở workspace') };
    this.queue = new Queue(INSIGHTS_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(FOLLOW_UP_SWEEP_JOB, { every: EVERY_MS }, { name: FOLLOW_UP_SWEEP_JOB });
    this.worker = new Worker(
      INSIGHTS_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== FOLLOW_UP_SWEEP_JOB) return;
        const r = await sweepFollowUps(deps);
        if (r.created || r.superseded) this.log.info({ job: FOLLOW_UP_SWEEP_JOB, ...r }, 'quét việc follow');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'insights scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
