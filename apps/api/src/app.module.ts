// Module gốc của API: kernel + health + 19 domain HTTP module (đăng ký sẵn ở TIP-001 — TIP sau KHÔNG sửa).
import { Module } from '@nestjs/common';
import { KernelModule } from '@appchat/core';
import { HealthModule } from './http/health/health.module';
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

@Module({ imports: [KernelModule, HealthModule, ...DOMAIN_HTTP_MODULES] })
export class AppModule {}
