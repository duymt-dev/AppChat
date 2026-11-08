// Domain `inbox` (TIP-016) — hội thoại, tin nhắn, inbound pipeline, gửi qua outbox, thẻ + câu trả lời mẫu (Blueprint §2.2 inbox,
// §3.4, §4.4, §6). Thiếu DB → service null (action / route trả 501). Luật realtime / thông báo nạp khi import module này;
// guard phòng `conv:{id}` (WS `conv.join`) đăng ký lúc khởi động.
import { Inject, Module, Optional, type OnModuleInit } from '@nestjs/common';
import { operationMode, type ChannelRegistry } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { can } from '@appchat/shared';
import { CLOCK, type Clock } from '../kernel/clock';
import { registerOwnershipPort } from '../kernel/ownership/registry';
import { conversationOwnershipPort } from './services/ownership-port';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { registerConversationGuard } from '../notify/realtime/conv-guard';
import { registerGrantLookup } from '../notify/realtime/filter';
import { grantsFor } from '../authz/data-access';
import { CHANNEL_REGISTRY, ChannelsModule, widgetUrlsFor } from '../channels/channels.module';
import { CrmModule } from '../crm/crm.module';
import { ContactIdentityService } from '../crm/services/identity.service';
import './events/inbox.rules';
import { ConversationAssignHandler, ConversationSetTagsHandler, ConversationTagHandler } from './actions/conversation-assign.handlers';
import { ConversationBulkUpdateHandler } from './actions/bulk-update.handler';
import { ConversationUnhideHandler, ConversationUntagHandler, MessageUnpinHandler, MessageUnreactHandler } from './actions/alias.handlers';
import { GROUP_HANDLERS } from './groups/group.handlers';
import {
  ConversationArchiveHandler,
  ConversationClearHistoryHandler,
  ConversationHandoffHandler,
  ConversationHideHandler,
  ConversationMarkReadHandler,
  ConversationPinHandler,
  ConversationSetAiModeHandler,
  ConversationSetStatusHandler,
} from './actions/conversation-state.handlers';
import { MessageDeleteHandler, MessageForwardHandler, MessagePinHandler, MessageSendHandler, NoteAddHandler } from './actions/message.handlers';
import { MessageReactHandler, MessageRecallHandler } from './actions/message-provider.handlers';
import { ContactSendEmailHandler } from './actions/email-send.handlers';
import { ConversationCreateGroupHandler } from './actions/conversation-create-group.handler';
import { CannedReplyCreateHandler, CannedReplyDeleteHandler, CannedReplyUpdateHandler, TagCreateHandler, TagDeleteHandler, TagUpdateHandler } from './actions/settings.handlers';
import { UUID, canSeeConversation } from './services/access';
import { InboxMetaService } from './services/meta.service';
import { InboundPipeline } from './services/pipeline';
import { InboxReadService } from './services/read.service';
import type { FileLinks } from './services/attachments';
import { FILE_LINKS } from './tokens';

const opt = (token: symbol) => ({ token, optional: true });

import { CannedReplySearchHandler, ConversationGetHandler, ConversationSearchHandler } from './actions/conversation-read.handlers';
import { ConversationApprovalsHandler } from './actions/conversation-approvals.handler';
import { TagSearchHandler } from './actions/tag-read.handler';

const HANDLERS = [
  ConversationSearchHandler, ConversationGetHandler, TagSearchHandler, CannedReplySearchHandler, ConversationApprovalsHandler,
  ConversationMarkReadHandler, ConversationSetStatusHandler, ConversationPinHandler, ConversationArchiveHandler, ConversationHideHandler,
  ConversationSetAiModeHandler, ConversationHandoffHandler, ConversationClearHistoryHandler,
  ConversationAssignHandler, ConversationTagHandler, ConversationSetTagsHandler, ConversationBulkUpdateHandler,
  MessageSendHandler, ContactSendEmailHandler, ConversationCreateGroupHandler, MessageForwardHandler, MessageRecallHandler, MessageDeleteHandler, MessageReactHandler, MessagePinHandler, NoteAddHandler,
  TagCreateHandler, TagUpdateHandler, TagDeleteHandler, CannedReplyCreateHandler, CannedReplyUpdateHandler, CannedReplyDeleteHandler,
  ConversationUnhideHandler, ConversationUntagHandler, MessageUnpinHandler, MessageUnreactHandler,
  ...GROUP_HANDLERS,
];

/** WS `conv.join`: `inbox.view` + hội thoại trong scope inbox của người đó. */
class ConversationGuardInstaller implements OnModuleInit {
  constructor(@Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined) {}

  onModuleInit(): void {
    // Port chuyển phụ trách hội thoại (TIP-015d) — CRM gọi trong transaction chuyển khách, không import Hộp thư.
    registerOwnershipPort(conversationOwnershipPort);
    const tenants = this.tenants;
    if (!tenants) return;
    registerConversationGuard(async ({ workspaceId, userId, authz, conversationId }) => {
      if (!can(authz, 'inbox.view') || !UUID.test(conversationId)) return false;
      const db = await tenants.get(TenantContexts.fromMembership(workspaceId, userId));
      const c = await db.conversation.findUnique({ where: { id: conversationId }, select: { id: true, contactId: true, assigneeUserId: true, teamId: true } });
      return !!c && canSeeConversation(db, authz, c);
    });
    // Quan hệ khách hiện tại cho bộ lọc realtime (TIP-042c) — gỡ watcher / collaborator có hiệu lực ở event kế tiếp.
    registerGrantLookup(async (workspaceId, contactId, userIds) => grantsFor(await tenants.get(TenantContexts.system(workspaceId, 'realtime.grants')), contactId, userIds));
  }
}

@Module({
  imports: [ChannelsModule, CrmModule],
  providers: [
    ...HANDLERS,
    ConversationGuardInstaller,
    {
      // Link tệp đính kèm trỏ về API public (cùng WIDGET_API_URL — origin API của widget / tệp, Blueprint §11).
      provide: FILE_LINKS,
      inject: [opt(ENV_SOURCE), opt(ENC_KEY)],
      useFactory: (src: Record<string, string | undefined> | undefined, key: Buffer | undefined): FileLinks | null => (key ? { apiBase: widgetUrlsFor(src ?? {}).api, key } : null),
    },
    {
      provide: InboxReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CLOCK, FILE_LINKS],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, c: Clock, l: FileLinks | null) => (r && p ? new InboxReadService(r, p, () => c.now(), l) : null),
    },
    {
      provide: InboxMetaService,
      inject: [InboxReadService, CHANNEL_REGISTRY, opt(PLATFORM_DB)],
      useFactory: (read: InboxReadService | null, reg: ChannelRegistry, p?: PlatformDb) => (read && p ? new InboxMetaService(read, reg, p) : null),
    },
    {
      provide: InboundPipeline,
      inject: [ContactIdentityService, CHANNEL_REGISTRY],
      // Ảnh đại diện chỉ với kênh khai `operations.profiles = remote` (TIP-014b D) — không `switch (type)`.
      useFactory: (i: ContactIdentityService, reg: ChannelRegistry) => new InboundPipeline(i, (t) => operationMode(reg.get(t)?.manifest.capabilities.operations, 'profiles') === 'remote'),
    },
  ],
  exports: [InboxReadService, InboxMetaService, InboundPipeline],
})
export class InboxModule {}
