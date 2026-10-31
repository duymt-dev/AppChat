// Controller HTTP của domain `sales`: TIP-029 báo giá (/v1/quotes*, /v1/public/quotes/:token), TIP-031 đơn hàng (/v1/orders*). Chỉ gắn khi env đủ DB + Redis +
// JWT_SECRET (`register`) — như catalog. TIP 032 thêm controller.
import { Module, type DynamicModule } from '@nestjs/common';
import { SalesModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { PublicQuotesController } from './public-quotes.controller';
import { QuotesController } from './quotes.controller';
import { OrdersController } from './orders.controller';

@Module({ imports: [SalesModule] })
export class SalesHttpModule {
  static register(): DynamicModule {
    return { module: SalesHttpModule, imports: [SalesModule, ActorModule], controllers: [QuotesController, PublicQuotesController, OrdersController] };
  }
}
