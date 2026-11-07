// Controller HTTP của domain `inbox` (TIP-016): /v1/conversations*, /v1/inbox/*, /v1/groups/:id, /v1/conversation-groups/:id (TIP-023b), /v1/conversations/:id/group* + /v1/inbox/group-commands/:id (TIP-025b), /v1/canned-replies, /v1/tags,
// /v1/settings/{tags,replies}. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như crm / channels.
import { Module, type DynamicModule } from '@nestjs/common';
import { ChannelsModule, InboxModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ConversationsController } from './conversations.controller';
import { InboxMetaController } from './inbox-meta.controller';
import { GroupRequestsController } from './group-requests.controller';
import { ChannelOperationsController } from './channel-operations.controller';
import { InboxGroupsController } from './inbox-groups.controller';
import { InboxApprovalsController } from './inbox-approvals.controller';

@Module({ imports: [InboxModule] })
export class InboxHttpModule {
  static register(): DynamicModule {
    return { module: InboxHttpModule, imports: [InboxModule, ChannelsModule, ActorModule], controllers: [ConversationsController, InboxMetaController, GroupRequestsController, ChannelOperationsController, InboxGroupsController, InboxApprovalsController] };
  }
}
