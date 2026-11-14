// Domain `billing` — plan, subscription, ví credit + sổ, CreditMeter, hạn mức (TIP-009); hoá đơn gói / đối soát (TIP-010).
// Service dựng bằng factory: thiếu DB nền tảng / DB tenant / Redis → null (process không cần billing vẫn boot).
import { Module, type OnApplicationBootstrap } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { ActionExecutor } from '../kernel/actions/executor';
import { domainVerifier, registerSystemVerifier } from '../kernel/actions/system';
import { BILLING_ACTOR } from './lifecycle/types';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { OutboxBillingSink, walletThresholdListener } from './events/billing.events';
import './events/billing.rules';
import { AdminConfirmTransferHandler } from './actions/admin-confirm-transfer.handler';
import { BillingCancelInvoiceHandler } from './actions/billing-cancel-invoice.handler';
import { BillingCreateInvoiceHandler } from './actions/billing-create-invoice.handler';
import { BillingReportTransferHandler } from './actions/billing-report-transfer.handler';
import { BillingApplyInvoiceHandler, BillingLifecycleStepHandler } from './actions/lifecycle.handlers';
import { WalletUpdateAlertsHandler } from './actions/wallet-alerts.handler';
import { BillingContactSalesHandler } from './actions/contact-sales.handler';
import { PlatformBankHook } from './payments/bank-hook.service';
import { InvoiceFulfiller } from './payments/fulfil';
import { InvoicesService } from './payments/invoices.service';
import { PAYMENTS_ENV, readPaymentsEnv, type PaymentsEnv } from './payments/payments.env';
import { seedPlans } from './seed';
import { BillingReadService } from './services/billing-read.service';
import { CreditMeter, DbPriceBook, PRICE_BOOK, StaticPriceBook, type PriceBook } from './services/credit-meter';
import { QuotaService } from './services/quota.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { WalletService } from './services/wallet.service';

const opt = (token: symbol) => ({ token, optional: true });
export const BILLING_SINK = Symbol('BILLING_SINK');

/** Seed gói lúc boot (idempotent) + nối ngưỡng ví → event + nối executor cho ghi nhận hoá đơn (TIP-039 — action system-only). */
class BillingBoot implements OnApplicationBootstrap {
  constructor(
    private readonly platform: PlatformDb | undefined,
    private readonly wallet: WalletService | null,
    private readonly sink: OutboxBillingSink | null,
    private readonly fulfiller: InvoiceFulfiller | null,
    private readonly executor: ActionExecutor | null,
  ) {}
  async onApplicationBootstrap(): Promise<void> {
    if (!this.platform) return;
    await seedPlans(this.platform);
    if (this.wallet && this.sink) this.wallet.onChange(walletThresholdListener(this.platform, this.sink));
    this.fulfiller?.useExecutor(this.executor);
  }
}

@Module({
  providers: [
    {
      provide: WalletService,
      inject: [opt(PLATFORM_DB), CLOCK],
      useFactory: (p: PlatformDb | undefined, c: Clock) => (p ? new WalletService(p, () => c.now()) : null),
    },
    {
      provide: BILLING_SINK,
      inject: [opt(TENANT_RESOLVER), opt(REDIS), CLOCK],
      useFactory: (r: TenantDbResolver | undefined, kv: Redis | undefined, c: Clock) => (r && kv ? new OutboxBillingSink(r, kv, () => c.now()) : null),
    },
    {
      provide: SubscriptionsService,
      inject: [opt(PLATFORM_DB), WalletService, BILLING_SINK, CLOCK],
      useFactory: (p: PlatformDb | undefined, w: WalletService | null, s: OutboxBillingSink | null, c: Clock) =>
        p && w && s ? new SubscriptionsService(p, w, s, () => c.now()) : null,
    },
    { provide: QuotaService, inject: [opt(PLATFORM_DB), CLOCK], useFactory: (p: PlatformDb | undefined, c: Clock) => (p ? new QuotaService(p, () => c.now()) : null) },
    {
      provide: BillingReadService,
      inject: [opt(PLATFORM_DB), CLOCK, opt(TENANT_RESOLVER)],
      // Kênh dùng đếm ở DB tenant (cùng quy tắc ChannelAccounts.countLive) — không import domain channels (tránh vòng module).
      useFactory: (p: PlatformDb | undefined, c: Clock, r: TenantDbResolver | undefined) =>
        p
          ? new BillingReadService(p, () => c.now(), r ? async (ws) => (await r.get(TenantContexts.system(ws, 'billing'))).channelAccount.count({ where: { status: { not: 'disconnected' } } }) : null)
          : null,
    },
    // Đơn giá model (TIP-019): `model_price` ở DB nền tảng; không DB → bảng giá rỗng (model chưa có giá → không chạy).
    { provide: PRICE_BOOK, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new DbPriceBook(p) : new StaticPriceBook()) },
    {
      provide: CreditMeter,
      inject: [WalletService, PRICE_BOOK, opt(PLATFORM_DB)],
      useFactory: (w: WalletService | null, pb: PriceBook, p?: PlatformDb) => (w ? new CreditMeter(w, pb, p) : null),
    },
    // Thu phí nền tảng (TIP-010): env tài khoản nhận tiền + nguồn đối soát; hoá đơn, ghi nhận, webhook ngân hàng.
    { provide: PAYMENTS_ENV, inject: [{ token: ENV_SOURCE, optional: true }], useFactory: (src?: Record<string, string | undefined>) => readPaymentsEnv(src ?? {}) },
    {
      provide: InvoicesService,
      inject: [opt(PLATFORM_DB), PAYMENTS_ENV, CLOCK],
      useFactory: (p: PlatformDb | undefined, e: PaymentsEnv, c: Clock) => (p ? new InvoicesService(p, e, () => c.now()) : null),
    },
    {
      provide: InvoiceFulfiller,
      inject: [opt(PLATFORM_DB), WalletService, BILLING_SINK, CLOCK],
      useFactory: (p: PlatformDb | undefined, w: WalletService | null, k: OutboxBillingSink | null, c: Clock) => (p && w && k ? new InvoiceFulfiller(p, w, k, () => c.now()) : null),
    },
    {
      provide: PlatformBankHook,
      inject: [opt(PLATFORM_DB), PAYMENTS_ENV, InvoiceFulfiller, CLOCK],
      useFactory: (p: PlatformDb | undefined, e: PaymentsEnv, f: InvoiceFulfiller | null, c: Clock) => (p && f ? new PlatformBankHook(p, e, f, () => c.now()) : null),
    },
    BillingCreateInvoiceHandler,
    BillingCancelInvoiceHandler,
    BillingReportTransferHandler,
    AdminConfirmTransferHandler,
    BillingLifecycleStepHandler,
    BillingApplyInvoiceHandler,
    WalletUpdateAlertsHandler,
    BillingContactSalesHandler,
    {
      provide: BillingBoot,
      inject: [opt(PLATFORM_DB), WalletService, BILLING_SINK, InvoiceFulfiller, opt(ActionExecutor as never)],
      useFactory: (p: PlatformDb | undefined, w: WalletService | null, s: OutboxBillingSink | null, f: InvoiceFulfiller | null, e?: ActionExecutor) => new BillingBoot(p, w, s, f, e ?? null),
    },
  ],
  exports: [WalletService, SubscriptionsService, QuotaService, BillingReadService, CreditMeter, PRICE_BOOK, BILLING_SINK, PAYMENTS_ENV, InvoicesService, InvoiceFulfiller, PlatformBankHook],
})
export class BillingModule {
  constructor() {
    // TIP-003c: action riêng tiền nhiệm 039 (sổ nền tảng 045b) — biên nhận kỳ / fulfilled_at là chống lặp (biên nhận domain).
    registerSystemVerifier('billing.lifecycle_step', domainVerifier(BILLING_ACTOR, ['schedule']), { receipt: 'domain', db: false });
    registerSystemVerifier('billing.apply_invoice', domainVerifier(BILLING_ACTOR, ['accepted_operation']), { receipt: 'domain', db: false });
  }
}
