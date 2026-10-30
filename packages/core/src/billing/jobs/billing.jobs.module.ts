// Worker ROLE=jobs của domain `billing` (TIP-009): consumer `billing.trial` (workspace.declared → trial) + scheduler hết hạn
// trial (BullMQ repeatable queue `scheduler`, job `billing.trial-expiry` mỗi 10 phút; jobId cố định → một lịch dù nhiều worker).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { BillingModule } from '../billing.module';
import { trialConsumer } from '../events/billing.events';
import { SubscriptionsService } from '../services/subscriptions.service';

export const SCHEDULER_QUEUE = 'scheduler';
export const TRIAL_EXPIRY_JOB = 'billing.trial-expiry';
const EVERY_MS = 10 * 60_000;

class BillingJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Inject(SubscriptionsService) private readonly subs: SubscriptionsService | null,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.subs) return;
    const subs = this.subs;
    registerEventConsumer(trialConsumer(subs));
    this.queue = new Queue(SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(TRIAL_EXPIRY_JOB, { every: EVERY_MS }, { name: TRIAL_EXPIRY_JOB });
    // Queue `scheduler` dùng chung nhiều domain: worker này chỉ xử lý job của billing, job khác bỏ qua (domain khác có worker riêng
    // trên cùng queue sẽ được BullMQ phân phối — mỗi domain đặt tên job riêng).
    this.worker = new Worker(
      SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== TRIAL_EXPIRY_JOB) return;
        const done = await subs.expireTrials();
        if (done.length) this.log.info({ job: TRIAL_EXPIRY_JOB, count: done.length }, 'trial hết hạn → gói Miễn phí');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'billing scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('billing.trial');
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [BillingModule], providers: [BillingJobsRunner] })
export class BillingJobsModule {}
