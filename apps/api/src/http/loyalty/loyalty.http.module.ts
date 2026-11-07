// Controller HTTP của domain `loyalty` (TIP-036): /v1/loyalty/*. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như crm.
import { Module, type DynamicModule } from '@nestjs/common';
import { LoyaltyModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { LoyaltyController } from './loyalty.controller';

@Module({ imports: [LoyaltyModule] })
export class LoyaltyHttpModule {
  static register(): DynamicModule {
    return { module: LoyaltyHttpModule, imports: [LoyaltyModule, ActorModule], controllers: [LoyaltyController] };
  }
}
