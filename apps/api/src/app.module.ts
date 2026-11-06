// Module gốc của API: kernel + health + route kernel (TIP-003) + 19 domain HTTP module (đăng ký sẵn ở TIP-001 — TIP sau KHÔNG sửa).
import { Module, type DynamicModule } from '@nestjs/common';
import { KernelModule } from '@appchat/core';
import { HealthModule } from './http/health/health.module';
import { KernelHttpModule } from './http/kernel/kernel.http.module';
import { IdentityHttpModule } from './http/identity/identity.http.module';
import { AuthzHttpModule } from './http/authz/authz.http.module';
import { BillingHttpModule } from './http/billing/billing.http.module';
import { ChannelsHttpModule } from './http/channels/channels.http.module';
import { InboxHttpModule } from './http/inbox/inbox.http.module';
import { CrmHttpModule } from './http/crm/crm.http.module';
import { CatalogHttpModule } from './http/catalog/catalog.http.module';
import { SalesHttpModule } from './http/sales/sales.http.module';
import { ContractsHttpModule } from './http/contracts/contracts.http.module';
import { DocumentsHttpModule } from './http/documents/documents.http.module';
import { IntegrationsHttpModule } from './http/integrations/integrations.http.module';
import { BookingHttpModule } from './http/booking/booking.http.module';
import { SupportHttpModule } from './http/support/support.http.module';
import { MarketingHttpModule } from './http/marketing/marketing.http.module';
import { LoyaltyHttpModule } from './http/loyalty/loyalty.http.module';
import { AiHttpModule } from './http/ai/ai.http.module';
import { FilesHttpModule } from './http/files/files.http.module';
import { InsightsHttpModule } from './http/insights/insights.http.module';
import { NotifyHttpModule } from './http/notify/notify.http.module';
import { PlatformHttpModule } from './http/platform/platform.http.module';

export const DOMAIN_HTTP_MODULES = [
    IdentityHttpModule,
    AuthzHttpModule,
    BillingHttpModule,
    ChannelsHttpModule,
    InboxHttpModule,
    CrmHttpModule,
    CatalogHttpModule,
    SalesHttpModule,
    ContractsHttpModule,
    DocumentsHttpModule,
    IntegrationsHttpModule,
    BookingHttpModule,
    SupportHttpModule,
    MarketingHttpModule,
    LoyaltyHttpModule,
    AiHttpModule,
    InsightsHttpModule,
    NotifyHttpModule,
    PlatformHttpModule,
];

/** Route kernel (actions / action-logs) + route identity chỉ khi env có DB + Redis + JWT_SECRET (executor + actor JWT). */
const withActions = (env: Record<string, string | undefined>) =>
  env.PLATFORM_DATABASE_URL && env.REDIS_URL && env.JWT_SECRET ? [KernelHttpModule.register(), IdentityHttpModule.register(), AuthzHttpModule.register(), NotifyHttpModule.register(), BillingHttpModule.register(), IntegrationsHttpModule.register(), CrmHttpModule.register(), LoyaltyHttpModule.register(), CatalogHttpModule.register(), DocumentsHttpModule.register(), SalesHttpModule.register(), BookingHttpModule.register(), SupportHttpModule.register(), MarketingHttpModule.register(), InsightsHttpModule.register(), ContractsHttpModule.register(), ChannelsHttpModule.register(), InboxHttpModule.register(), AiHttpModule.register(), FilesHttpModule.register(), PlatformHttpModule.register()] : [];

@Module({})
export class AppModule {
  static forRoot(env: Record<string, string | undefined> = process.env): DynamicModule {
    return { module: AppModule, imports: [KernelModule.forRoot(env), HealthModule, ...withActions(env), ...DOMAIN_HTTP_MODULES] };
  }
}
