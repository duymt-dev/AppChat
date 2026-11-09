// Worker ROLE=jobs của domain `privacy` (TIP-015c pha 2): scheduler `privacy.sweep` mỗi phút trên queue riêng `privacy-scheduler`
// (jobId cố định → một lịch dù nhiều worker) — tiến từng operation đang chạy đúng một bước PRIVACY_FLOW mỗi lượt quét. Chỉ bật khi có
// Redis + DB nền tảng + executor (giống crm/loyalty jobs module).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { ActionExecutor } from '../../kernel/actions/executor';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { PrivacyModule } from '../privacy.module';
import { PRIVACY_SCHEDULER_QUEUE, PRIVACY_SWEEP_EVERY_MS, PRIVACY_SWEEP_JOB, sweepPrivacy } from './privacy.scheduler';

class PrivacyJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { redis, platform, tenants, executor } = this;
    if (!redis || !platform || !tenants || !executor) return;
    const deps = { platform, tenants, executor, now: () => this.clock.now(), onError: (ws: string, operationId: string, err: unknown) => this.log.warn({ err, ws, operationId, job: PRIVACY_SWEEP_JOB }, 'quét Quên khách lỗi') };
    this.queue = new Queue(PRIVACY_SCHEDULER_QUEUE, { connection: redis.duplicate() });
    await this.queue.upsertJobScheduler(PRIVACY_SWEEP_JOB, { every: PRIVACY_SWEEP_EVERY_MS }, { name: PRIVACY_SWEEP_JOB });
    this.worker = new Worker(
      PRIVACY_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== PRIVACY_SWEEP_JOB) return;
        const r = await sweepPrivacy(deps);
        if (r.advanced) this.log.info({ job: PRIVACY_SWEEP_JOB, ...r }, 'quét Quên khách');
      },
      { connection: redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'privacy scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [PrivacyModule], providers: [PrivacyJobsRunner] })
export class PrivacyJobsModule {}
