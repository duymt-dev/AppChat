// Worker ROLE=jobs của domain `sales` (TIP-029): scheduler `sales.quote-sweep` mỗi 15 phút trên queue riêng `sales-scheduler` (queue
// `scheduler` dùng chung thì worker domain khác nhận job này và bỏ qua như đã xong — DC; jobId cố định → một lịch dù nhiều worker) — báo giá quá hạn → `expired`, còn ≤ 2 ngày → nhắc người phụ trách; consumer `sales.quote-owner`
// (TIP-015d: không còn ghi — báo giá chuyển cùng transaction với khách; event cũ bỏ qua có log). TIP-031: queue `order-sync` (poll sàn 5 phút) + consumer webhook sàn — order-sync.jobs.ts. TIP 032 thêm processor.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { reminderCalendarOf } from '../../kernel/time/reminder-schedule';
import { registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { SalesModule } from '../sales.module';
import { ChannelsModule } from '../../channels/channels.module';
import { CrmModule } from '../../crm/crm.module';
import { expireDue, remindExpiring } from '../quotes/services/quote-system';
import { OrderSyncService } from '../orders/services/order-sync';
import { ORDER_SYNC_EVERY_MS, ORDER_SYNC_JOB, ORDER_SYNC_QUEUE, orderSyncConsumer, syncOrders } from './order-sync.jobs';
import { PAYMENT_PACKAGES_CONSUMER, PAYMENT_PACKAGES_TOPICS, PAYMENT_SWEEP_EVERY_MS, PAYMENT_SWEEP_JOB, paymentPackagesConsumer, sweepPayments } from './payment.jobs';
import { paymentPackageTriggers } from '../system/dispatch';
import { QuoteDeps } from '../quotes/services/quote-deps';
import { ActionExecutor } from '../../kernel/actions/executor';
import { BANK_INGEST_CONSUMER, bankIngestConsumer, bankIngestEventTrigger } from '../payments/bank/bank-event.consumer';
import { registerSystemAdapter } from '../../kernel/actions/system';
import { RECEIPT_TOPIC } from '../payments/bank/receipt';
import { stagePulledReceipts } from '../payments/bank/receipt';
import { BANK_PULL_OP, bankPullOp, registerCallOp, unregisterCallOp } from '../../integrations/public';

export const SALES_SCHEDULER_QUEUE = 'sales-scheduler';
export const QUOTE_SWEEP_JOB = 'sales.quote-sweep';
const EVERY_MS = 15 * 60_000;

/**
 * TIP-015d: báo giá chuyển CÙNG transaction với khách (port `quote` của contact.transfer_owner) — consumer này KHÔNG còn ghi. Event cũ
 * còn trong hàng đợi (trước khi nâng cấp) được nhận và bỏ qua có ghi log kiểm toán; không bao giờ phát lại `to` của event lên khách hiện tại.
 */
export const quoteOwnerConsumer = (log?: { info(o: object, m: string): void }): EventConsumer => ({
  name: 'sales.quote-owner',
  topics: ['contact.owner_changed'],
  async handle(e) {
    const p = e.payload as { contact_id: string; transfer_id?: string; move?: { quotes?: boolean } };
    if (p.move?.quotes && !p.transfer_id) log?.info({ event_id: e.id, ws: e.workspaceId, contact_id: p.contact_id, marker: 'legacy_owner_event_nonmutating' }, 'bỏ qua event chuyển báo giá cũ');
  },
});

/** Quét mọi workspace đang hoạt động: hết hạn + nhắc T-2. Lỗi một workspace (DB chưa nâng migration…) không chặn workspace khác. */
export async function sweepQuotes(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; executor: Pick<ActionExecutor, 'execute'>; now: () => Date; onError?: (ws: string, err: unknown) => void }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true, settings: true } });
  let expired = 0;
  let reminded = 0;
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, QUOTE_SWEEP_JOB));
      const now = d.now();
      const sys = { executor: d.executor, tenants: d.tenants, onError: (_id: string, err: unknown) => d.onError?.(w.id, err) };
      expired += await expireDue(db, w.id, now, sys);
      reminded += await remindExpiring(db, w.id, now, reminderCalendarOf(w), sys);
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
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // TIP-003c: chuyển trạng thái hệ thống chạy qua action riêng — không executor thì không chạy (không còn đường ghi thẳng).
    if (!this.redis || !this.platform || !this.tenants || !this.executor) return;
    const now = () => this.clock.now();
    const sys = { executor: this.executor, tenants: this.tenants };
    registerEventConsumer(quoteOwnerConsumer(this.log));
    registerEventConsumer(paymentPackagesConsumer(sys));
    registerSystemAdapter({ name: PAYMENT_PACKAGES_CONSUMER, topics: PAYMENT_PACKAGES_TOPICS, actionId: 'package.system_transition', triggers: paymentPackageTriggers }, sys);
    // TIP-012b P2: biên nhận ngân hàng đã ACK → khớp / ghi nhận qua ActionExecutor nguồn system (ngoài transaction consumer).
    registerEventConsumer(bankIngestConsumer(this.executor, this.tenants));
    // TIP-003c: adapter action-mode v2 (cùng trigger / biên nhận domain của 012b; v1 giữ tới cutover).
    registerSystemAdapter({ name: BANK_INGEST_CONSUMER, topics: [RECEIPT_TOPIC], actionId: 'bank_feed.ingest', triggers: (e) => [bankIngestEventTrigger(e)].filter((t) => !!t) }, { executor: this.executor, tenants: this.tenants });
    // TIP-012b P3: op kéo giao dịch của integrations ghi biên nhận bằng luật của sales (hội tụ với webhook).
    registerCallOp(BANK_PULL_OP, bankPullOp(stagePulledReceipts));
    const deps = { platform: this.platform, tenants: this.tenants, executor: this.executor, now, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: QUOTE_SWEEP_JOB }, 'quét báo giá lỗi ở workspace') };
    const pay = { ...deps, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: PAYMENT_SWEEP_JOB }, 'quét khoản thu lỗi ở workspace') };
    this.queue = new Queue(SALES_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(QUOTE_SWEEP_JOB, { every: EVERY_MS }, { name: QUOTE_SWEEP_JOB });
    await this.queue.upsertJobScheduler(PAYMENT_SWEEP_JOB, { every: PAYMENT_SWEEP_EVERY_MS }, { name: PAYMENT_SWEEP_JOB });
    this.worker = new Worker(
      SALES_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name === PAYMENT_SWEEP_JOB) {
          const r = await sweepPayments(pay);
          if (r.overdue || r.reminded || r.expired || r.packageReminders) this.log.info({ job: PAYMENT_SWEEP_JOB, ...r }, 'quét khoản thu');
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
    unregisterEventConsumer(BANK_INGEST_CONSUMER);
    unregisterCallOp(BANK_PULL_OP);
    await this.worker?.close();
    await this.queue?.close();
    await this.syncWorker?.close();
    await this.syncQueue?.close();
  }
}

@Module({ imports: [SalesModule, ChannelsModule, CrmModule], providers: [SalesJobsRunner] })
export class SalesJobsModule {}
