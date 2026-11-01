// Outbox relay trong worker ROLE=jobs (events/outbox.md §2): drain outbox:dirty mỗi giây, sweep mọi DB 10 phút,
// publish sang BullMQ queue `events` (jobId = event id → không trùng khi relay chạy lại); EventsRunner (TIP-006) chạy consumer.
// Chỉ bật khi có DB + Redis.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { TenantDbResolver, WorkspaceRegistry } from '@appchat/db';
import { CLOCK, type Clock } from '../clock';
import { LOGGER } from '../kernel.module';
import type { AppLogger } from '../logger/logger';
import { REDIS } from '../redis';
import { TENANT_RESOLVER, WORKSPACE_REGISTRY } from '../tenant/tenant.providers';
import { EVENTS_QUEUE, EventsRunner } from '../events/events.runner';
import { drainDirty, sweepAll, type EventPublisher, type RelayDeps } from './relay';

export class BullEventPublisher implements EventPublisher {
  constructor(private readonly queue: Queue) {}
  async publish(e: Parameters<EventPublisher['publish']>[0]): Promise<void> {
    // Consumer lỗi → retry back-off mũ (outbox §2), tối đa 8 lần; consumer đã xong không chạy lại (event_consumption).
    await this.queue.add(e.topic, { ...e }, { jobId: e.id, attempts: 8, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 });
  }
}

class OutboxRelayRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private timers: NodeJS.Timeout[] = [];
  private queue?: Queue;
  private busy = false;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly resolver: TenantDbResolver | undefined,
    @Optional() @Inject(WORKSPACE_REGISTRY) private readonly registry: WorkspaceRegistry | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.redis || !this.resolver || !this.registry) return;
    this.queue = new Queue(EVENTS_QUEUE, { connection: this.redis.duplicate() });
    const deps: RelayDeps = { resolver: this.resolver, registry: this.registry, kv: this.redis, publisher: new BullEventPublisher(this.queue), clock: this.clock };
    const guard = (name: string, fn: () => Promise<unknown>) => async () => {
      if (this.busy) return;
      this.busy = true;
      try {
        await fn();
      } catch (err) {
        this.log.warn({ err, job: name }, 'outbox relay lỗi — thử lại lượt sau');
      } finally {
        this.busy = false;
      }
    };
    this.timers.push(setInterval(guard('outbox-drain', () => drainDirty(deps)), 1000));
    this.timers.push(setInterval(guard('outbox-sweep', () => sweepAll(deps)), 600_000));
    this.timers.forEach((t) => t.unref());
  }

  async onApplicationShutdown(): Promise<void> {
    this.timers.forEach(clearInterval);
    await this.queue?.close();
  }
}

@Module({ providers: [OutboxRelayRunner, EventsRunner] })
export class OutboxJobsModule {}
