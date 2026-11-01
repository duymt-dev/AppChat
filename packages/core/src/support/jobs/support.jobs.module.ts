// Worker ROLE=jobs của domain `support` (TIP-034, Blueprint §1.4 "SLA tick"): scheduler `support.sla-sweep` mỗi phút trên queue riêng
// `support-scheduler` (jobId cố định → một lịch dù nhiều worker) — sắp đến hạn / quá hạn FRT / TTR → leo thang. Consumer `support` của
// queue `events`: tin khách vào hội thoại có ticket (bình luận, Đang chờ → Đang xử lý, tự mở lại trong 7 ngày, CSAT) + trả lời đầu.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { messageReceivedEvent, messageSentEvent } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../kernel/events/consumer';
import { SupportModule } from '../support.module';
import { SlaCalendar } from '../services/sla-clock';
import { onAgentReply, onCustomerMessage, sweepSla } from '../services/support-system';

export const SUPPORT_SCHEDULER_QUEUE = 'support-scheduler';
export const SLA_SWEEP_JOB = 'support.sla-sweep';
const EVERY_MS = 60_000;

export interface SlaSweepDeps {
  platform: PlatformDb;
  tenants: TenantDbResolver;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

export async function sweepSupport(d: SlaSweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const total = { warned: 0, breached: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, SLA_SWEEP_JOB));
      const r = await sweepSla(db, w.id, d.now());
      total.warned += r.warned;
      total.breached += r.breached;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}

export const supportConsumer = (cal: SlaCalendar, now: () => Date): EventConsumer => ({
  name: 'support',
  topics: ['message.received', 'message.sent'],
  async handle(e, db) {
    if (e.topic === 'message.received') {
      const p = messageReceivedEvent.parse(e.payload);
      await onCustomerMessage(db, e.workspaceId, p, now(), await cal.of(e.workspaceId));
    } else {
      await onAgentReply(db, messageSentEvent.parse(e.payload), now());
    }
  },
});

class SupportJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants) return;
    const now = () => this.clock.now();
    registerEventConsumer(supportConsumer(this.cal, now));
    const deps: SlaSweepDeps = { platform: this.platform, tenants: this.tenants, now, onError: (ws, err) => this.log.warn({ err, ws, job: SLA_SWEEP_JOB }, 'quét SLA lỗi ở workspace') };
    this.queue = new Queue(SUPPORT_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(SLA_SWEEP_JOB, { every: EVERY_MS }, { name: SLA_SWEEP_JOB });
    this.worker = new Worker(
      SUPPORT_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== SLA_SWEEP_JOB) return;
        const r = await sweepSupport(deps);
        if (r.warned || r.breached) this.log.info({ job: SLA_SWEEP_JOB, ...r }, 'quét SLA');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'support scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('support');
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [SupportModule], providers: [SupportJobsRunner] })
export class SupportJobsModule {}
