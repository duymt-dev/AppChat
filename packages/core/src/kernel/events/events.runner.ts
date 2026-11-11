// Worker BullMQ queue `events` (ROLE=jobs — Blueprint §1.3): job do outbox relay publish (jobId = event id) → dispatchEvent.
// Bật cùng relay trong OutboxJobsModule khi có DB + Redis.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { type Job } from 'bullmq';
import { Worker } from '../jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { TenantDbResolver } from '@appchat/db';
import { LOGGER } from '../kernel.module';
import type { AppLogger } from '../logger/logger';
import { REDIS } from '../redis';
import { TENANT_RESOLVER } from '../tenant/tenant.providers';
import { dispatchEvent } from './dispatcher';
import { dispatchV2Job } from './protocol/v2-job';

export const EVENTS_QUEUE = 'events';

interface EventJob {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  workspaceId: string;
  traceId: string | null;
  /** 2 = đánh thức chỉ id (TIP-003b) — dispatcher v2 nạp hàng có thẩm quyền, kiểm sẵn sàng + head. */
  protocolVersion?: 2;
}

export class EventsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly resolver: TenantDbResolver | undefined,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.redis || !this.resolver) return;
    const resolver = this.resolver;
    this.worker = new Worker(EVENTS_QUEUE, async (job: Job<EventJob>) => (job.data.protocolVersion === 2 ? dispatchV2Job(resolver, job.data, this.log) : dispatchEvent(resolver, job.data, this.log)), {
      connection: this.redis.duplicate(),
      concurrency: 8,
    });
    this.worker.on('failed', (job, err) =>
      this.log.warn({ err, topic: job?.name, event_id: job?.data.id, attempt: job?.attemptsMade }, 'event job lỗi'),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
