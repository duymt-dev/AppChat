// Hoạt động CRM (TIP-026b): ghi chú / bình luận, việc chăm sóc, cơ hội — handler action + quyền thành viên (người được giao việc).
// CrmModule nhập module này (ROLE=ai nhận cùng đăng ký qua CrmModule). contact_activity.list cần CrmMembers → đăng ký ở CrmModule.
import { Module } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { AuthzModule } from '../../authz/authz.module';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import { MemberAuthz } from './member-authz';
import { ContactAddCommentHandler, ContactAddNoteHandler } from './notes.handlers';
import { ContactTaskCreateHandler, ContactTaskSetStateHandler, ContactTaskUpdateHandler } from './tasks.handlers';
import { ContactOpportunityArchiveHandler, ContactOpportunityCreateHandler, ContactOpportunityUpdateHandler } from './opportunities.handlers';

@Module({
  imports: [AuthzModule],
  providers: [
    {
      provide: MemberAuthz,
      inject: [{ token: PLATFORM_DB, optional: true }, { token: AuthzResolver, optional: true }],
      useFactory: (p?: PlatformDb, a?: AuthzResolver | null) => new MemberAuthz(p ?? null, a ?? null),
    },
    ContactAddNoteHandler,
    ContactAddCommentHandler,
    ContactTaskCreateHandler,
    ContactTaskUpdateHandler,
    ContactTaskSetStateHandler,
    ContactOpportunityCreateHandler,
    ContactOpportunityUpdateHandler,
    ContactOpportunityArchiveHandler,
  ],
  exports: [MemberAuthz],
})
export class ContactActivitiesModule {}
