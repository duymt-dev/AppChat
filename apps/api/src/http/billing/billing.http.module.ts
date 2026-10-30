// Controller HTTP của domain `billing` (TIP-009): /v1/billing/summary|plans|wallet|ledger; TIP-010 thêm hoá đơn gói.
// Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như identity / authz / notify.
import { Module, type DynamicModule } from '@nestjs/common';
import { BillingModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { BillingController } from './billing.controller';

@Module({ imports: [BillingModule] })
export class BillingHttpModule {
  static register(): DynamicModule {
    return { module: BillingHttpModule, imports: [BillingModule, ActorModule], controllers: [BillingController] };
  }
}
