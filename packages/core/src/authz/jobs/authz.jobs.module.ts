// BullMQ processor của domain `authz` (worker ROLE=jobs). TIP-042: `authz.legacy-delegations` mỗi giờ (và ngay lúc khởi động) chuyển
// uỷ quyền P0 `membership.delegations` sang vai trò tuỳ biến P1 (DC-298) — idempotent, có điều kiện, không ghi đè thay đổi mới hơn.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AuthzModule } from '../authz.module';
import { LEGACY_DELEGATIONS_JOB, convertLegacyDelegations } from '../services/legacy-delegations';

export const AUTHZ_SCHEDULER_QUEUE = 'authz-scheduler';
const EVERY_MS = 60 * 60_000;
/** Job chạy ngay lúc khởi động — BullMQ cấm `:` trong custom id (worker dừng với "Custom Id cannot contain :"). */
export const LEGACY_DELEGATIONS_BOOT_ID = `${LEGACY_DELEGATIONS_JOB}-boot`;

class AuthzJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants) return;
    const deps = { platform: this.platform, tenants: this.tenants, now: () => this.clock.now(), onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: LEGACY_DELEGATIONS_JOB }, 'chuyển uỷ quyền P0 lỗi ở workspace') };
    this.queue = new Queue(AUTHZ_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(LEGACY_DELEGATIONS_JOB, { every: EVERY_MS }, { name: LEGACY_DELEGATIONS_JOB });
    await this.queue.add(LEGACY_DELEGATIONS_JOB, {}, { jobId: LEGACY_DELEGATIONS_BOOT_ID, removeOnComplete: true, removeOnFail: true });
    this.worker = new Worker(
      AUTHZ_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== LEGACY_DELEGATIONS_JOB) return;
        const r = await convertLegacyDelegations(deps);
        if (r.converted || r.skipped) this.log.info({ job: LEGACY_DELEGATIONS_JOB, ...r }, 'chuyển uỷ quyền P0 sang vai trò tuỳ biến');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'authz scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [AuthzModule], providers: [AuthzJobsRunner] })
export class AuthzJobsModule {}
