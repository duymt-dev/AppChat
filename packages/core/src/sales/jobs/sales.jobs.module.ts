// Worker ROLE=jobs của domain `sales` (TIP-029): scheduler `sales.quote-sweep` mỗi 15 phút trên queue riêng `sales-scheduler` (queue
// `scheduler` dùng chung thì worker domain khác nhận job này và bỏ qua như đã xong — DC; jobId cố định → một lịch dù nhiều worker) — báo giá quá hạn → `expired`, còn ≤ 2 ngày → nhắc người phụ trách; consumer `sales.quote-owner`
// (`contact.owner_changed` có move.quotes → chuyển báo giá đang mở cho người mới — COMMERCE §8b). TIP-031: queue `order-sync` (poll sàn 5 phút) + consumer webhook sàn — order-sync.jobs.ts. TIP 032 thêm processor.
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
import { ChannelsModule } from '../../channels/channels.module';
import { CrmModule } from '../../crm/crm.module';
import { expireDue, moveOpenQuotes, remindExpiring } from '../quotes/services/quote-system';
import { OrderSyncService } from '../orders/services/order-sync';
import { ORDER_SYNC_EVERY_MS, ORDER_SYNC_JOB, ORDER_SYNC_QUEUE, orderSyncConsumer, syncOrders } from './order-sync.jobs';
import { PAYMENT_SWEEP_EVERY_MS, PAYMENT_SWEEP_JOB, paymentPackagesConsumer, sweepPayments } from './payment.jobs';
import { QuoteDeps } from '../quotes/services/quote-deps';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers } from '../../crm/public';
import { enqueueOutgoing } from '../../inbox/public';

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
  private syncQueue?: Queue;
  private syncWorker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Optional() @Inject(OrderSyncService) private readonly sync: OrderSyncService | null,
    @Inject(QuoteDeps) private readonly quotes: QuoteDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Optional() @Inject(ChannelSendQueue) private readonly send: ChannelSendQueue | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants) return;
    const now = () => this.clock.now();
    registerEventConsumer(quoteOwnerConsumer(now));
    registerEventConsumer(paymentPackagesConsumer(now));
    const deps = { platform: this.platform, tenants: this.tenants, now, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: QUOTE_SWEEP_JOB }, 'quét báo giá lỗi ở workspace') };
    const pay = {
      ...deps,
      quotes: this.quotes,
      members: this.members,
      enqueue: (ws: string, o: Parameters<typeof enqueueOutgoing>[2]) => enqueueOutgoing(this.send, ws, o),
      onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: PAYMENT_SWEEP_JOB }, 'quét khoản thu lỗi ở workspace'),
    };
    this.queue = new Queue(SALES_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(QUOTE_SWEEP_JOB, { every: EVERY_MS }, { name: QUOTE_SWEEP_JOB });
    await this.queue.upsertJobScheduler(PAYMENT_SWEEP_JOB, { every: PAYMENT_SWEEP_EVERY_MS }, { name: PAYMENT_SWEEP_JOB });
    this.worker = new Worker(
      SALES_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name === PAYMENT_SWEEP_JOB) {
          const r = await sweepPayments(pay);
          if (r.overdue || r.reminded || r.expired) this.log.info({ job: PAYMENT_SWEEP_JOB, ...r }, 'quét khoản thu');
          return;
        }
        if (job.name !== QUOTE_SWEEP_JOB) return;
        const r = await sweepQuotes(deps);
        if (r.expired || r.reminded) this.log.info({ job: QUOTE_SWEEP_JOB, ...r }, 'quét báo giá');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'sales scheduler lỗi'));
    await this.startOrderSync();
  }

  /** Queue riêng `order-sync` (poll sàn có thể chậm — không giữ queue scheduler của báo giá). */
  private async startOrderSync() {
    const sync = this.sync;
    if (!sync || !this.redis || !this.platform || !this.tenants) return;
    registerEventConsumer(orderSyncConsumer(sync));
    const deps = { platform: this.platform, tenants: this.tenants, sync, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: ORDER_SYNC_JOB }, 'đồng bộ đơn sàn lỗi ở workspace') };
    this.syncQueue = new Queue(ORDER_SYNC_QUEUE, { connection: this.redis.duplicate() });
    await this.syncQueue.upsertJobScheduler(ORDER_SYNC_JOB, { every: ORDER_SYNC_EVERY_MS }, { name: ORDER_SYNC_JOB });
    this.syncWorker = new Worker(
      ORDER_SYNC_QUEUE,
      async (job) => {
        if (job.name !== ORDER_SYNC_JOB) return;
        const r = await syncOrders(deps);
        if (r.imported) this.log.info({ job: ORDER_SYNC_JOB, ...r }, 'đồng bộ đơn sàn');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.syncWorker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'order-sync lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('sales.quote-owner');
    unregisterEventConsumer('sales.order-sync');
    unregisterEventConsumer('sales.payment-packages');
    await this.worker?.close();
    await this.queue?.close();
    await this.syncWorker?.close();
    await this.syncQueue?.close();
  }
}

@Module({ imports: [SalesModule, ChannelsModule, CrmModule], providers: [SalesJobsRunner] })
export class SalesJobsModule {}
