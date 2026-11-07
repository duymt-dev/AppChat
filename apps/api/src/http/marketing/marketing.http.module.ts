// Controller HTTP của domain `marketing` (TIP-037): /v1/campaigns*, /v1/segments, /v1/campaign-suggestions + trang huỷ nhận tin công khai
// /v1/public/campaign-unsubscribe/:token. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như support.
import { Module, type DynamicModule } from '@nestjs/common';
import { MarketingModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { MarketingController } from './marketing.controller';
import { MarketingUnsubscribeController } from './marketing-unsubscribe.controller';

@Module({ imports: [MarketingModule] })
export class MarketingHttpModule {
  static register(): DynamicModule {
    return { module: MarketingHttpModule, imports: [MarketingModule, ActorModule], controllers: [MarketingController, MarketingUnsubscribeController] };
  }
}
