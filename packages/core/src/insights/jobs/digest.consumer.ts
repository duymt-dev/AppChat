// Lịch email tóm tắt (TIP-038 pha 4, DC-366) — ROLE=jobs: lịch `insights.digest` mỗi 15 phút trên queue RIÊNG (queue `insights-scheduler`
// có worker quét follow bỏ qua job tên khác → dùng chung sẽ mất lượt). jobId cố định → một lịch dù nhiều worker. Mỗi workspace đang hoạt
// động → action system-only `digest.dispatch` qua ActionExecutor: `plan` (ghi sổ kỳ vừa đóng, unique) rồi `send` (giành + gửi sau commit).
// Hai worker cùng lúc → unique + CAS giữ một email mỗi (người, nhịp, kỳ). Lỗi một workspace không chặn workspace khác. Không Redis → không chạy.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import { ActionExecutor } from '../../kernel/actions/executor';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { DIGEST_ACTOR } from '../actions/digest.handlers';
import { domainTrigger, runSystemAction } from '../../kernel/actions/system';

export const DIGEST_QUEUE = 'insights-digest';
export const DIGEST_JOB = 'insights.digest';
const EVERY_MS = 15 * 60_000;

/** Không khoá idempotency: mỗi lượt phải làm việc thật (sổ unique + CAS tự chống trùng), không trả kết quả cũ. */
export const digestCtx = (ws: string): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: DIGEST_ACTOR },
  authz: { isOwner: true } as never,
});

type Counts = { planned: number; sent: number; skipped: number; unknown: number; failed: number };

export interface DigestRunDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  executor: Pick<ActionExecutor, 'execute'>;
  onError?: (ws: string, err: unknown) => void;
}

/** Một lượt mọi workspace: plan rồi send — trả tổng (sent = số email đã giành để gửi; kết quả cuối nằm ở sổ). */
export async function runDigests(d: DigestRunDeps): Promise<Counts> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const r: Counts = { planned: 0, sent: 0, skipped: 0, unknown: 0, failed: 0 };
  for (const w of wss) {
    try {
      for (const step of ['plan', 'send'] as const) {
        // TIP-003c: action riêng tiền nhiệm 038 qua capability gắn lượt lịch; sổ unique + CAS của domain là chống lặp.
        const t = domainTrigger({ workspaceId: w.id, actionId: 'digest.dispatch', actor: DIGEST_ACTOR, sourceKind: 'schedule', sourceRef: `${DIGEST_JOB}:${step}`, targetId: w.id, input: { step } });
        const out = (await runSystemAction(d.executor, null, t, digestCtx(w.id))) as {
          data?: { result?: Partial<Counts> };
        };
        for (const k of Object.keys(r) as (keyof Counts)[]) r[k] += out.data?.result?.[k] ?? 0;
      }
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return r;
}

export class DigestScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.executor) return;
    const deps: DigestRunDeps = {
      platform: this.platform,
      executor: this.executor,
      onError: (ws, err) => this.log.warn({ err, ws, job: DIGEST_JOB }, 'email tóm tắt lỗi ở workspace'),
    };
    this.queue = new Queue(DIGEST_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(DIGEST_JOB, { every: EVERY_MS }, { name: DIGEST_JOB });
    this.worker = new Worker(
      DIGEST_QUEUE,
      async (job) => {
        if (job.name !== DIGEST_JOB) return;
        const r = await runDigests(deps);
        if (r.planned || r.sent || r.skipped || r.unknown)
          this.log.info({ job: DIGEST_JOB, ...r }, 'email tóm tắt');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'digest scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
