// Worker ROLE=jobs cho việc dữ liệu nặng (TIP-045b annex D): consumer `data-jobs` của queue `events` — `data_job.requested` (ghi cùng
// commit với action nhận việc) → chạy việc; lịch `data-jobs-scheduler` mỗi 30 giây quét việc dang dở có lease hết hạn (worker chết giữa
// chừng / restart) → chạy tiếp từ biên nhận. Lease / fence ở từng việc nên hai worker không xử lý trùng bản ghi. Kind (export / bulk) do
// domain đăng ký (`registerDataJobKind`) khi module domain nạp ở ROLE=jobs.
import { hostname } from 'node:os';
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AuthzModule } from '../../../authz/authz.module';
import { AuthzResolver } from '../../../authz/services/authz-resolver';
import { CLOCK, type Clock } from '../../clock';
import { registerEventConsumer, unregisterEventConsumer } from '../../events/consumer';
import { LOGGER } from '../../kernel.module';
import type { AppLogger } from '../../logger/logger';
import { REDIS } from '../../redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../tenant/tenant.providers';
import { Queue, Worker } from '../with-job-context';
import { runDataJob, type RunDeps } from '../bulk-dispatch';
import { DataJobStatusService, allowedAction } from '../bulk-status';
import { STORAGE, type Storage } from '../../files/storage';
import { DataJobCancelHandler, DataJobRetryHandler } from './handlers';

export const DATA_JOBS_QUEUE = 'data-jobs-scheduler';
const SWEEP_JOB = 'data-jobs.sweep';
const SWEEP_MS = 30_000;

class DataJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(AuthzResolver) private readonly authz: AuthzResolver | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  /** Phụ thuộc chạy (test gọi thẳng). */
  deps(): RunDeps | null {
    const { platform, authz } = this;
    if (!platform || !authz) return null;
    return {
      authzOf: async (ws, userId) => {
        if (!userId) return null;
        const m = await platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
        return m ? authz.resolve(ws, userId, m) : null;
      },
      allowed: allowedAction,
      now: () => this.clock.now(),
      owner: `${hostname()}:${process.pid}`,
    };
  }

  async run(ws: string, jobId: string) {
    const d = this.deps();
    if (!d || !this.tenants) return null;
    return runDataJob(await this.tenants.get(TenantContexts.system(ws, 'data-job')), ws, jobId, d);
  }

  /** Việc dang dở có lease hết hạn (hoặc chưa ai giành) ở mọi workspace đang hoạt động. */
  async sweep(limit = 20): Promise<number> {
    const { platform, tenants } = this;
    if (!platform || !tenants) return 0;
    const now = this.clock.now();
    const wss = await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
    let n = 0;
    for (const w of wss) {
      try {
        const db = await tenants.get(TenantContexts.system(w.id, 'data-job'));
        const open = await db.dataJob.findMany({
          where: { status: { in: ['queued', 'running', 'cancelling'] }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }], updatedAt: { lt: new Date(now.getTime() - 5_000) } },
          orderBy: { updatedAt: 'asc' },
          take: limit,
          select: { id: true },
        });
        for (const j of open) {
          await this.run(w.id, j.id);
          n++;
        }
      } catch (err) {
        this.log.warn({ err, ws: w.id }, 'quét việc dữ liệu lỗi ở workspace');
      }
    }
    return n;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants || !this.authz) return;
    registerEventConsumer({
      name: 'kernel.data-jobs',
      topics: ['data_job.requested'],
      handle: async (e) => {
        const id = (e.payload as { job_id?: string }).job_id;
        if (id) await this.run(e.workspaceId, id);
      },
    });
    this.queue = new Queue(DATA_JOBS_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(SWEEP_JOB, { every: SWEEP_MS }, { name: SWEEP_JOB });
    this.worker = new Worker(DATA_JOBS_QUEUE, async (job) => (job.name === SWEEP_JOB ? this.sweep() : null), { connection: this.redis.duplicate(), concurrency: 1 });
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'data-jobs scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('kernel.data-jobs');
    await this.worker?.close();
    await this.queue?.close();
  }
}

export const DATA_JOBS_RUNTIME = DataJobsRunner;

const opt = (token: symbol) => ({ token, optional: true });

/** API + worker: action data_job.cancel / retry + đọc trạng thái / tải tệp (domain có kind import module này). */
@Module({
  providers: [
    DataJobCancelHandler,
    DataJobRetryHandler,
    {
      provide: DataJobStatusService,
      inject: [opt(TENANT_RESOLVER), opt(STORAGE), CLOCK],
      useFactory: (r: TenantDbResolver | undefined, st: Storage | undefined, c: Clock) => (r ? new DataJobStatusService(r, st ?? null, () => c.now()) : null),
    },
  ],
  exports: [DataJobStatusService],
})
export class DataJobActionsModule {}

/** Worker ROLE=jobs: consumer + quét việc dang dở (nạp qua JobsModule của domain có kind). */
@Module({ imports: [AuthzModule], providers: [DataJobsRunner], exports: [DataJobsRunner] })
export class DataJobsModule {}
