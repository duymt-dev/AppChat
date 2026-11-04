// Domain `sales` — quote (TIP-029), order (031 — 10 action `order.*`, đọc /v1/orders*, đồng bộ sàn OrderSyncService), invoice / customer payment / customer_package / bank feed (032 — 15 handler, /v1/invoices*, webhook tenant-payments). Báo giá: handler 13
// action `quote.*`, đọc cho /v1/quotes*, trang xem công khai, PDF (DocRenderer — TIP-028). Thiếu DB / khoá → service null / 501.
import { Module } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { connectorRegistry } from '@appchat/integrations';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { REDIS } from '../kernel/redis';
import { FilesService } from '../kernel/files/files.service';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { AiModule } from '../ai/ai.module';
import { ChannelsModule } from '../channels/channels.module';
import { widgetUrlsFor } from '../channels/public';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { DocumentsModule } from '../documents/documents.module';
import { DocRenderer } from '../documents/public';
import { QuoteApproveHandler, QuoteRejectInternalHandler, QuoteSubmitHandler } from './quotes/actions/quote-approval.handlers';
import { QuoteAcceptHandler, QuoteRejectHandler, QuoteRevisionHandler } from './quotes/actions/quote-decide.handlers';
import { QuoteDraftFromContentHandler } from './quotes/actions/quote-draft.handler';
import { QuoteExtendHandler, QuoteSendHandler } from './quotes/actions/quote-send.handlers';
import { QuoteCommentHandler, QuoteCreateHandler, QuoteDeleteHandler, QuoteUpdateHandler } from './quotes/actions/quote-write.handlers';
import { QuoteGetHandler, QuoteSearchHandler } from './quotes/actions/quote-read.handlers';
import { OrderGetHandler, OrderSearchHandler } from './orders/actions/order-read.handlers';
import { InvoiceGetHandler, InvoiceSearchHandler, PackageSearchHandler } from './payments/actions/invoice-read.handlers';
import { QuoteDeps } from './quotes/services/quote-deps';
import { quoteEnvFor } from './quotes/services/quote-env';
import { QuotesReadService } from './quotes/services/quotes-read.service';
import { SalesSettingsModule } from './settings/settings.module';
import { OrderFromContractHandler, OrderFromQuoteHandler, OrderCreateHandler } from './orders/actions/order-create.handlers';
import { OrderSetDepositHandler, OrderShippingHandler, OrderUpdateHandler } from './orders/actions/order-edit.handlers';
import { OrderCancelHandler, OrderCompleteHandler, OrderConfirmHandler } from './orders/actions/order-flow.handlers';
import { OrderSyncNowHandler } from './orders/actions/order-sync.handler';
import { OrderFromAppointmentHandler } from './orders/actions/order-from-appointment.handler';
import { OrdersReadService } from './orders/services/orders-read.service';
import { OrderSyncService } from './orders/services/order-sync';
import { InvoiceCreateHandler, InvoiceSendHandler, InvoiceVoidHandler } from './payments/actions/invoice-write.handlers';
import { InvoiceRecordPaymentHandler, InvoiceResolveBankMatchHandler } from './payments/actions/invoice-pay.handlers';
import { PaymentRefundApproveHandler, PaymentRefundHandler, PaymentRefundRejectHandler } from './payments/actions/refund.handlers';
import { PackageAdjustHandler, PackageExtendHandler } from './payments/actions/package.handlers';
import { BankFeedConnectHandler, BankFeedDisconnectHandler, PaymentAccountUpdateHandler } from './payments/actions/finance-config.handlers';
import { InvoicesReadService } from './payments/services/invoices-read.service';
import { TenantBankHook } from './payments/services/bank-feed';
import { IntegrationsModule } from '../integrations/integrations.module';

const opt = (token: symbol | typeof FilesService | typeof DocRenderer) => ({ token, optional: true });
const ORDER_SYNC_KV = Symbol('ORDER_SYNC_KV');

const HANDLERS = [
  QuoteCreateHandler, QuoteUpdateHandler, QuoteDeleteHandler, QuoteCommentHandler,
  QuoteSubmitHandler, QuoteApproveHandler, QuoteRejectInternalHandler,
  QuoteSendHandler, QuoteExtendHandler,
  QuoteAcceptHandler, QuoteRejectHandler, QuoteRevisionHandler,
  QuoteDraftFromContentHandler,
  OrderCreateHandler, OrderFromQuoteHandler, OrderFromContractHandler,
  OrderUpdateHandler, OrderSetDepositHandler, OrderShippingHandler,
  OrderConfirmHandler, OrderCompleteHandler, OrderCancelHandler, OrderSyncNowHandler, OrderFromAppointmentHandler,
  InvoiceCreateHandler, InvoiceSendHandler, InvoiceVoidHandler, InvoiceRecordPaymentHandler, InvoiceResolveBankMatchHandler,
  PaymentRefundHandler, PaymentRefundApproveHandler, PaymentRefundRejectHandler, PackageExtendHandler, PackageAdjustHandler, PackageSearchHandler,
  PaymentAccountUpdateHandler, BankFeedConnectHandler, BankFeedDisconnectHandler,
  // Đọc bản ghi cho Trợ lý / agent (TIP-023b R2).
  QuoteSearchHandler, QuoteGetHandler, OrderSearchHandler, OrderGetHandler, InvoiceSearchHandler, InvoiceGetHandler,
];

@Module({
  imports: [CrmModule, DocumentsModule, ChannelsModule, AiModule, IntegrationsModule, SalesSettingsModule],
  providers: [
    ...HANDLERS,
    {
      provide: QuoteDeps,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(DocRenderer), opt(FilesService), opt(ENV_SOURCE), opt(ENC_KEY), CrmMembers],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, d: DocRenderer | null | undefined, f: FilesService | undefined, src: Record<string, string | undefined> | undefined, key: Buffer | undefined, m: CrmMembers) => {
        const env = src ?? process.env;
        return new QuoteDeps(r ?? null, p ?? null, d ?? null, f ?? null, quoteEnvFor(env, key, widgetUrlsFor(env).api), m);
      },
    },
    {
      provide: OrdersReadService,
      inject: [QuoteDeps, CLOCK],
      useFactory: (d: QuoteDeps, c: Clock) => (d.tenants && d.platform ? new OrdersReadService(d, () => c.now()) : null),
    },
    { provide: ORDER_SYNC_KV, inject: [opt(REDIS)], useFactory: (r?: Redis) => r ?? null },
    {
      provide: OrderSyncService,
      inject: [opt(TENANT_RESOLVER), opt(ENC_KEY), ORDER_SYNC_KV, CLOCK],
      useFactory: (t: TenantDbResolver | undefined, k: Buffer | undefined, kv: Redis | null, c: Clock) =>
        t && k ? new OrderSyncService({ tenants: t, registry: connectorRegistry, key: k, kv, now: () => c.now() }) : null,
    },
    {
      provide: InvoicesReadService,
      inject: [QuoteDeps, CLOCK],
      useFactory: (d: QuoteDeps, c: Clock) => (d.tenants && d.platform ? new InvoicesReadService(d, () => c.now()) : null),
    },
    {
      provide: TenantBankHook,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(ENC_KEY), ORDER_SYNC_KV, CLOCK],
      useFactory: (t: TenantDbResolver | undefined, p: PlatformDb | undefined, k: Buffer | undefined, kv: Redis | null, c: Clock) =>
        t && p && k ? new TenantBankHook({ tenants: t, platform: p, registry: connectorRegistry, key: k, kv, now: () => c.now() }) : null,
    },
    {
      provide: QuotesReadService,
      inject: [QuoteDeps, CLOCK],
      useFactory: (d: QuoteDeps, c: Clock) => (d.tenants && d.platform ? new QuotesReadService(d, () => c.now()) : null),
    },
  ],
  exports: [SalesSettingsModule, QuotesReadService, QuoteDeps, OrdersReadService, OrderSyncService, InvoicesReadService, TenantBankHook],
})
export class SalesModule {}
