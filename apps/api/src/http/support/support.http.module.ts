// Controller HTTP của domain `support` (TIP-034): ticket /v1/tickets* + từ điển gợi ý danh mục (TIP-034b). Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như sales.
import { Module, type DynamicModule } from '@nestjs/common';
import { SupportModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { TicketsController } from './tickets.controller';
import { TicketCategoriesController } from './ticket-categories.controller';

@Module({ imports: [SupportModule] })
export class SupportHttpModule {
  static register(): DynamicModule {
    return { module: SupportHttpModule, imports: [SupportModule, ActorModule], controllers: [TicketsController, TicketCategoriesController] };
  }
}
