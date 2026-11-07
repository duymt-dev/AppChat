// Worker ROLE=jobs của domain `billing` (TIP-009): consumer `billing.trial` (workspace.declared → trial) + scheduler hết hạn
// trial (BullMQ repeatable queue `scheduler`, job `billing.trial-expiry` mỗi 10 phút; jobId cố định → một lịch dù nhiều worker).
// TIP-010: job `billing.invoice-sweep` mỗi phút — QR quá 15 phút → expired; hoá đơn paid chưa ghi nhận → ghi nhận (DC-055).
// TIP-045b annex E: `billing.reconcile` mỗi giờ — đối soát nền tảng ↔ tenant, chỉ ghi phát hiện (reconcile.ts).
// TIP-039: consumer `ai.credit-handoff` (credits.exhausted → hội thoại auto sang người); backfill addon cũ lúc boot (addon-backfill.ts); `billing.lifecycle` mỗi 5 phút — cấp Credit kỳ tháng / hết kỳ / hạ gói kỳ sau (lifecycle.runner.ts). Queue RIÊNG `billing-scheduler`
// (trước 039 là `scheduler` dùng chung: worker nhận job lạ rồi trả thành công → job domain khác có thể bị nuốt).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { BillingModule } from '../billing.module';
import { trialConsumer } from '../events/billing.events';
import { InvoiceFulfiller } from '../payments/fulfil';
import { SubscriptionsService } from '../services/subscriptions.service';
import { ActionExecutor } from '../../kernel/actions/executor';
import { CREDIT_HANDOFF_CONSUMER, creditHandoffConsumer } from '../../ai/reply/credit-handoff.consumer';
import { WalletService } from '../services/wallet.service';
import { backfillLegacyAddons } from './addon-backfill';
import { LIFECYCLE_BATCH, runLifecycle } from './lifecycle.runner';
import { RECONCILE_EVERY_MS, RECONCILE_JOB, reconcileAll } from './reconcile';

export const SCHEDULER_QUEUE = 'billing-scheduler';
export const TRIAL_EXPIRY_JOB = 'billing.trial-expiry';
export const INVOICE_SWEEP_JOB = 'billing.invoice-sweep';
export const LIFECYCLE_JOB = 'billing.lifecycle';
const EVERY_MS = 10 * 60_000;
const INVOICE_EVERY_MS = 60_000;
const LIFECYCLE_EVERY_MS = 5 * 60_000;

class BillingJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Inject(SubscriptionsService) private readonly subs: SubscriptionsService | null,
    @Inject(InvoiceFulfiller) private readonly invoices: InvoiceFulfiller | null,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants?: TenantDbResolver,
    @Optional() @Inject(CLOCK) private readonly clock?: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor?: ActionExecutor,
    @Optional() @Inject(WalletService) private readonly wallet?: WalletService | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.subs) return;
    const subs = this.subs;
    registerEventConsumer(trialConsumer(subs));
    // Hết Credit → hội thoại AI tự động sang người (bền qua outbox; kiểm lại số dư hiện tại — event trễ sau khi nạp không chuyển).
    const wallet = this.wallet;
    if (wallet) registerEventConsumer(creditHandoffConsumer({ balance: async (ws) => (await wallet.balance(ws)).total, kv: this.redis, now: () => this.clock?.now() ?? new Date() }));
    this.queue = new Queue(SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(TRIAL_EXPIRY_JOB, { every: EVERY_MS }, { name: TRIAL_EXPIRY_JOB });
    if (this.invoices) await this.queue.upsertJobScheduler(INVOICE_SWEEP_JOB, { every: INVOICE_EVERY_MS }, { name: INVOICE_SWEEP_JOB });
    const reconcile = this.platform && this.tenants ? { platform: this.platform, tenants: this.tenants } : null;
    if (reconcile) await this.queue.upsertJobScheduler(RECONCILE_JOB, { every: RECONCILE_EVERY_MS }, { name: RECONCILE_JOB });
    const lifecycle = this.platform && this.executor ? { platform: this.platform, executor: this.executor } : null;
    if (lifecycle) await this.queue.upsertJobScheduler(LIFECYCLE_JOB, { every: LIFECYCLE_EVERY_MS }, { name: LIFECYCLE_JOB });
    // Addon trả trước 039 không ảnh chụp → giữ đối soát một lần lúc boot (idempotent; không cấp, không đổi tiền).
    if (this.platform)
      void backfillLegacyAddons({ platform: this.platform, now: () => this.clock?.now() ?? new Date() }, { dryRun: false })
        .then((r) => r.held && this.log.warn({ job: 'billing.addon-backfill', ...r }, 'addon cũ chờ đối soát'))
        .catch((err) => this.log.warn({ err, job: 'billing.addon-backfill' }, 'backfill addon lỗi'));
    const invoices = this.invoices;
    // Queue riêng của billing: mọi job trên queue là của worker này; tên lạ → lỗi (không âm thầm báo thành công).
    this.worker = new Worker(
      SCHEDULER_QUEUE,
      async (job) => {
        if (job.name === LIFECYCLE_JOB && lifecycle) {
          const r = await runLifecycle({ ...lifecycle, now: () => this.clock?.now() ?? new Date(), onError: (ws, err) => this.log.warn({ err, ws, job: LIFECYCLE_JOB }, 'vòng đời gói lỗi ở workspace') }, LIFECYCLE_BATCH);
          if (r.workspaces) this.log.info({ job: LIFECYCLE_JOB, ...r }, 'vòng đời gói');
          return;
        }
        if (job.name === INVOICE_SWEEP_JOB && invoices) {
          const expired = await invoices.expire();
          const fulfilled = await invoices.fulfilPending();
          if (expired || fulfilled) this.log.info({ job: INVOICE_SWEEP_JOB, expired, fulfilled }, 'quét hoá đơn gói');
          return;
        }
        if (job.name === RECONCILE_JOB && reconcile) {
          const r = await reconcileAll({
            ...reconcile,
            now: () => this.clock?.now() ?? new Date(),
            // Chỉ id workspace + loại kiểm + số đếm (không PII); lỗi một workspace không chặn lượt.
            onFinding: (ws, f) => this.log.warn({ job: RECONCILE_JOB, ws, check: f.check, severity: f.severity, detail: f.detail }, 'đối soát phát hiện lệch'),
            onError: (ws, err) => this.log.warn({ err, ws, job: RECONCILE_JOB }, 'đối soát lỗi ở workspace'),
          });
          this.log.info({ job: RECONCILE_JOB, cutoff: r.cutoff.toISOString(), workspaces: r.workspaces, findings: r.findings, failed: r.failed }, 'đối soát xong');
          return;
        }
        if (job.name !== TRIAL_EXPIRY_JOB) throw new Error(`billing-scheduler: job lạ ${job.name}`);
        const done = await subs.expireTrials();
        if (done.length) this.log.info({ job: TRIAL_EXPIRY_JOB, count: done.length }, 'trial hết hạn → gói Miễn phí');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'billing scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('billing.trial');
    unregisterEventConsumer(CREDIT_HANDOFF_CONSUMER);
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [BillingModule], providers: [BillingJobsRunner] })
export class BillingJobsModule {}
