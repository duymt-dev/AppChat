// Hoạt động CRM (TIP-026b): ghi chú / bình luận, việc chăm sóc — handler action + quyền thành viên (người được giao việc). Cơ hội dời sang
// crm/opportunities (TIP-026c — CrmModule đăng ký OPPORTUNITY_HANDLERS).
// CrmModule nhập module này (ROLE=ai nhận cùng đăng ký qua CrmModule). contact_activity.list cần CrmMembers → đăng ký ở CrmModule.
import { Module } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { AuthzModule } from '../../authz/authz.module';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import { MemberAuthz } from './member-authz';
import { ContactAddCommentHandler, ContactAddNoteHandler } from './notes.handlers';
import { ContactTaskCreateHandler, ContactTaskSetStateHandler, ContactTaskUpdateHandler } from './tasks.handlers';

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
  ],
  exports: [MemberAuthz],
})
export class ContactActivitiesModule {}
