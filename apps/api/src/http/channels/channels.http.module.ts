// Controller HTTP của domain `channels` (TIP-014): /v1/settings/channels*. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET
// (`register`) — như identity / crm. TIP-017: Cài đặt › Trợ lý AI website + Socket.IO `/widget`. TIP-018 (email) thêm controller vào đây.
// TIP-042b: Cài đặt › Chia lead (`settings/lead-routing`, service đọc ở CrmModule).
import { Module, type DynamicModule } from '@nestjs/common';
import { ChannelsModule, CrmModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ChannelsController } from './channels.controller';
import { ChannelSyncController } from './channel-sync.controller';
import { ChannelFriendsController } from './channel-friends.controller';
import { WidgetController } from './widget.controller';
import { WidgetGateway } from './widget.gateway';
import { WidgetScriptController } from './widget-script.controller';
import { LeadRoutingController } from './lead-routing.controller';

@Module({ imports: [ChannelsModule] })
export class ChannelsHttpModule {
  static register(): DynamicModule {
    return { module: ChannelsHttpModule, imports: [ChannelsModule, CrmModule, ActorModule], controllers: [ChannelsController, ChannelSyncController, ChannelFriendsController, WidgetController, WidgetScriptController, LeadRoutingController], providers: [WidgetGateway] };
  }
}
