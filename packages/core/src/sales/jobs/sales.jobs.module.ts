// Worker ROLE=jobs của domain `sales` (TIP-029): scheduler `sales.quote-sweep` mỗi 15 phút trên queue riêng `sales-scheduler` (queue
// `scheduler` dùng chung thì worker domain khác nhận job này và bỏ qua như đã xong — DC; jobId cố định → một lịch dù nhiều worker) — báo giá quá hạn → `expired`, còn ≤ 2 ngày → nhắc người phụ trách; consumer `sales.quote-owner`
// (`contact.owner_changed` có move.quotes → chuyển báo giá đang mở cho người mới — COMMERCE §8b). TIP 031, 032 thêm processor.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { SalesModule } from '../sales.module';
import { expireDue, moveOpenQuotes, remindExpiring } from '../quotes/services/quote-system';

export const SALES_SCHEDULER_QUEUE = 'sales-scheduler';
export const QUOTE_SWEEP_JOB = 'sales.quote-sweep';
const EVERY_MS = 15 * 60_000;

/** Consumer chuyển báo giá theo phụ trách mới của khách. */
export const quoteOwnerConsumer = (now: () => Date): EventConsumer => ({
  name: 'sales.quote-owner',
  topics: ['contact.owner_changed'],
  async handle(e, db) {
    const p = e.payload as { contact_id: string; to: string; move?: { quotes?: boolean } };
    if (p.move?.quotes) await moveOpenQuotes(db, p.contact_id, p.to, now());
  },
});

/** Quét mọi workspace đang hoạt động: hết hạn + nhắc T-2. Lỗi một workspace (DB chưa nâng migration…) không chặn workspace khác. */
export async function sweepQuotes(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; now: () => Date; onError?: (ws: string, err: unknown) => void }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true } });
  let expired = 0;
  let reminded = 0;
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, QUOTE_SWEEP_JOB));
      const now = d.now();
      expired += await expireDue(db, w.id, now);
      reminded += await remindExpiring(db, w.id, now, w.timezone);
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return { expired, reminded };
}

class SalesJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
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
    const now = () => this.clock.now();
    registerEventConsumer(quoteOwnerConsumer(now));
    const deps = { platform: this.platform, tenants: this.tenants, now, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: QUOTE_SWEEP_JOB }, 'quét báo giá lỗi ở workspace') };
    this.queue = new Queue(SALES_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(QUOTE_SWEEP_JOB, { every: EVERY_MS }, { name: QUOTE_SWEEP_JOB });
    this.worker = new Worker(
      SALES_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== QUOTE_SWEEP_JOB) return;
        const r = await sweepQuotes(deps);
        if (r.expired || r.reminded) this.log.info({ job: QUOTE_SWEEP_JOB, ...r }, 'quét báo giá');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'sales scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('sales.quote-owner');
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [SalesModule], providers: [SalesJobsRunner] })
export class SalesJobsModule {}
