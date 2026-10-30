// Controller HTTP của domain `channels` (TIP-014): /v1/settings/channels*. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET
// (`register`) — như identity / crm. TIP 017 (webchat) / 018 (email) thêm controller vào đây.
import { Module, type DynamicModule } from '@nestjs/common';
import { ChannelsModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ChannelsController } from './channels.controller';

@Module({ imports: [ChannelsModule] })
export class ChannelsHttpModule {
  static register(): DynamicModule {
    return { module: ChannelsHttpModule, imports: [ChannelsModule, ActorModule], controllers: [ChannelsController] };
  }
}
