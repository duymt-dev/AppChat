// Provider việc nền marketing (TIP-037) — các jobs module chỉ trải mảng / lớp ở đây:
// · MarketingSendInstaller (ROLE=channels): chốt chặn `cr_` của worker gửi — đặt chỗ + ghi kết quả qua Executor.
// · MarketingScheduler (ROLE=jobs): lịch `marketing.campaign-tick` mỗi phút trên queue riêng (jobId cố định → một lịch dù nhiều worker).
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { ActionExecutor } from '../../kernel/actions/executor';
import { registerSendGuard, unregisterSendGuard } from '../../channels/public';
import { MarketingDeps } from '../services/marketing-deps';
import { RECIPIENT_REF_PREFIX } from './campaign-dispatch';
import { campaignSendGuard } from './campaign-results';
import { CAMPAIGN_TICK_JOB, MARKETING_SCHEDULER_QUEUE, tickCampaigns, type TickDeps } from './campaign-scheduler';

const EVERY_MS = 60_000;

export class MarketingSendInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.tenants || !this.executor) return;
    registerSendGuard(RECIPIENT_REF_PREFIX, campaignSendGuard({ tenants: this.tenants, executor: this.executor, now: () => this.clock.now() }));
  }

  onApplicationShutdown(): void {
    unregisterSendGuard(RECIPIENT_REF_PREFIX);
  }
}

export class MarketingScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  /** Phụ thuộc quét (test gọi `tickCampaigns` trực tiếp). */
  deps(): TickDeps | null {
    const { platform, tenants, executor } = this;
    if (!platform || !tenants || !executor) return null;
    return { platform, tenants, executor, send: this.d.send, links: this.d.links, now: () => this.clock.now(), onError: (ws, err) => this.log.warn({ err, ws, job: CAMPAIGN_TICK_JOB }, 'quét chiến dịch lỗi ở workspace') };
  }

  async onApplicationBootstrap(): Promise<void> {
    const deps = this.deps();
    if (!this.redis || !deps) return;
    this.queue = new Queue(MARKETING_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(CAMPAIGN_TICK_JOB, { every: EVERY_MS }, { name: CAMPAIGN_TICK_JOB });
    this.worker = new Worker(
      MARKETING_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== CAMPAIGN_TICK_JOB) return;
        const r = await tickCampaigns(deps);
        if (r.dispatched || r.requeued) this.log.info({ job: CAMPAIGN_TICK_JOB, ...r }, 'quét chiến dịch');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'marketing scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
