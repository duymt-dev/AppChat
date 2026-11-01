// Controller HTTP của domain `sales`: TIP-029 báo giá (/v1/quotes*, /v1/public/quotes/:token), TIP-031 đơn hàng (/v1/orders*), TIP-032 đề nghị thanh toán (/v1/invoices*,
// /v1/settings/payments, /v1/contacts/:id/packages) + webhook /hooks/tenant-payments/:provider/:feedId. Chỉ gắn khi env đủ DB + Redis +
// JWT_SECRET (`register`) — như catalog.
import { Module, type DynamicModule } from '@nestjs/common';
import { SalesModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { PublicQuotesController } from './public-quotes.controller';
import { QuotesController } from './quotes.controller';
import { OrdersController } from './orders.controller';
import { InvoicesController } from './invoices.controller';
import { TenantPaymentsHookController } from './tenant-payments-hook.controller';

@Module({ imports: [SalesModule] })
export class SalesHttpModule {
  static register(): DynamicModule {
    return { module: SalesHttpModule, imports: [SalesModule, ActorModule], controllers: [QuotesController, PublicQuotesController, OrdersController, InvoicesController, TenantPaymentsHookController] };
  }
}
