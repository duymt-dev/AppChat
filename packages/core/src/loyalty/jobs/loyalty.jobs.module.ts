// Worker ROLE=jobs của domain `loyalty` (TIP-036): consumer `loyalty.orders` (`order.completed` → tích, `order.cancelled` → đảo + trả điểm)
// + `loyalty.payments` (`payment.refunded` → đảo theo tỉ lệ), scheduler `loyalty.sweep` mỗi giờ trên queue riêng `loyalty-scheduler`
// (jobId cố định → một lịch dù nhiều worker): hết hạn FIFO + xét hạng đầu quý. Mọi ghi qua ActionExecutor nguồn system. Chỉ bật khi có
// Redis + DB nền tảng + executor.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { ActionExecutor } from '../../kernel/actions/executor';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { LoyaltyModule } from '../loyalty.module';
import { LOYALTY_ORDERS_CONSUMER, loyaltyOrdersConsumer } from '../events/order-consumer';
import { LOYALTY_PAYMENTS_CONSUMER, loyaltyPaymentsConsumer } from '../events/payment-consumer';
import { LOYALTY_SCHEDULER_QUEUE, LOYALTY_SWEEP_EVERY_MS, LOYALTY_SWEEP_JOB, sweepLoyalty } from './loyalty.scheduler';

class LoyaltyJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
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
    registerEventConsumer(loyaltyOrdersConsumer(executor));
    registerEventConsumer(loyaltyPaymentsConsumer(executor));
    const deps = { platform, tenants, executor, now: () => this.clock.now(), onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: LOYALTY_SWEEP_JOB }, 'quét loyalty lỗi ở workspace') };
    this.queue = new Queue(LOYALTY_SCHEDULER_QUEUE, { connection: redis.duplicate() });
    await this.queue.upsertJobScheduler(LOYALTY_SWEEP_JOB, { every: LOYALTY_SWEEP_EVERY_MS }, { name: LOYALTY_SWEEP_JOB });
    this.worker = new Worker(
      LOYALTY_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== LOYALTY_SWEEP_JOB) return;
        const r = await sweepLoyalty(deps);
        if (r.expired || r.tiers) this.log.info({ job: LOYALTY_SWEEP_JOB, ...r }, 'quét loyalty');
      },
      { connection: redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'loyalty scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer(LOYALTY_ORDERS_CONSUMER);
    unregisterEventConsumer(LOYALTY_PAYMENTS_CONSUMER);
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [LoyaltyModule], providers: [LoyaltyJobsRunner] })
export class LoyaltyJobsModule {}
