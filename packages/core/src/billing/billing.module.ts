// Domain `billing` — plan, subscription, ví credit + sổ, CreditMeter, hạn mức (TIP-009); hoá đơn gói / đối soát (TIP-010).
// Service dựng bằng factory: thiếu DB nền tảng / DB tenant / Redis → null (process không cần billing vẫn boot).
import { Module, type OnApplicationBootstrap } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { OutboxBillingSink, walletThresholdListener } from './events/billing.events';
import { seedPlans } from './seed';
import { BillingReadService } from './services/billing-read.service';
import { CreditMeter, PRICE_BOOK, StaticPriceBook, type PriceBook } from './services/credit-meter';
import { QuotaService } from './services/quota.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { WalletService } from './services/wallet.service';

const opt = (token: symbol) => ({ token, optional: true });
export const BILLING_SINK = Symbol('BILLING_SINK');

/** Seed gói lúc boot (idempotent) + nối ngưỡng ví → event. */
class BillingBoot implements OnApplicationBootstrap {
  constructor(
    private readonly platform: PlatformDb | undefined,
    private readonly wallet: WalletService | null,
    private readonly sink: OutboxBillingSink | null,
  ) {}
  async onApplicationBootstrap(): Promise<void> {
    if (!this.platform) return;
    await seedPlans(this.platform);
    if (this.wallet && this.sink) this.wallet.onChange(walletThresholdListener(this.platform, this.sink));
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
    { provide: QuotaService, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new QuotaService(p) : null) },
    { provide: BillingReadService, inject: [opt(PLATFORM_DB), CLOCK], useFactory: (p: PlatformDb | undefined, c: Clock) => (p ? new BillingReadService(p, () => c.now()) : null) },
    // Bảng giá model thật ở TIP-019 (model_price) — ghi đè provider này.
    { provide: PRICE_BOOK, useFactory: () => new StaticPriceBook() },
    {
      provide: CreditMeter,
      inject: [WalletService, PRICE_BOOK],
      useFactory: (w: WalletService | null, pb: PriceBook) => (w ? new CreditMeter(w, pb) : null),
    },
    {
      provide: BillingBoot,
      inject: [opt(PLATFORM_DB), WalletService, BILLING_SINK],
      useFactory: (p: PlatformDb | undefined, w: WalletService | null, s: OutboxBillingSink | null) => new BillingBoot(p, w, s),
    },
  ],
  exports: [WalletService, SubscriptionsService, QuotaService, BillingReadService, CreditMeter, PRICE_BOOK, BILLING_SINK],
})
export class BillingModule {}
