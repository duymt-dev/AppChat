// Controller HTTP của domain `inbox` (TIP-016): /v1/conversations*, /v1/inbox/*, /v1/groups/:id, /v1/conversation-groups/:id (TIP-023b), /v1/canned-replies, /v1/tags,
// /v1/settings/{tags,replies}. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như crm / channels.
import { Module, type DynamicModule } from '@nestjs/common';
import { ChannelsModule, InboxModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ConversationsController } from './conversations.controller';
import { InboxMetaController } from './inbox-meta.controller';
import { GroupRequestsController } from './group-requests.controller';

@Module({ imports: [InboxModule] })
export class InboxHttpModule {
  static register(): DynamicModule {
    return { module: InboxHttpModule, imports: [InboxModule, ChannelsModule, ActorModule], controllers: [ConversationsController, InboxMetaController, GroupRequestsController] };
  }
}
