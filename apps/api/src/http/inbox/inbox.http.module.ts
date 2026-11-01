// Controller HTTP của domain `inbox` (TIP-016): /v1/conversations*, /v1/inbox/*, /v1/groups/:id, /v1/canned-replies, /v1/tags,
// /v1/settings/{tags,replies}. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như crm / channels.
import { Module, type DynamicModule } from '@nestjs/common';
import { InboxModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ConversationsController } from './conversations.controller';
import { InboxMetaController } from './inbox-meta.controller';

@Module({ imports: [InboxModule] })
export class InboxHttpModule {
  static register(): DynamicModule {
    return { module: InboxHttpModule, imports: [InboxModule, ActorModule], controllers: [ConversationsController, InboxMetaController] };
  }
}
