// Domain `crm` (TIP-015): khách hàng, phụ trách + đồng phụ trách + xin chia sẻ (D32), gộp trùng, liên kết khách theo kênh (C06),
// trường tuỳ biến (D56), bố cục Hồ sơ 360° (F12), xuất / nhập. Seed mặc định đăng ký khi nạp `seeds.ts`. Thiếu DB → service null.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import './seeds';
import { ContactAddCollaboratorHandler, ContactDecideAccessHandler, ContactRemoveCollaboratorHandler, ContactRequestAccessHandler, ContactTransferOwnerHandler } from './actions/contact-owner.handlers';
import { ContactExportHandler, ContactImportHandler, ContactSendEmailHandler } from './actions/contact-io.handlers';
import { ContactMergeHandler } from './actions/contact-merge.handler';
import { ContactCreateHandler, ContactDeleteHandler, ContactSetStageHandler, ContactTagHandler, ContactUpdateHandler } from './actions/contact-write.handlers';
import { CustomFieldDefineHandler, CustomFieldDeleteHandler, CustomFieldUpdateHandler } from './actions/custom-field.handlers';
import { ProfileLayoutAssignRoleHandler, ProfileLayoutCreateHandler, ProfileLayoutDeleteHandler, ProfileLayoutDuplicateHandler, ProfileLayoutUpdateHandler } from './actions/profile-layout.handlers';
import { CrmReadService } from './services/crm-read.service';
import { ContactIdentityService } from './services/identity.service';
import { CrmMembers } from './services/members.service';

const opt = (token: symbol) => ({ token, optional: true });

const HANDLERS = [
  ContactCreateHandler, ContactUpdateHandler, ContactSetStageHandler, ContactTagHandler, ContactDeleteHandler, ContactMergeHandler,
  ContactAddCollaboratorHandler, ContactRemoveCollaboratorHandler, ContactTransferOwnerHandler, ContactRequestAccessHandler, ContactDecideAccessHandler,
  ContactExportHandler, ContactImportHandler, ContactSendEmailHandler,
  CustomFieldDefineHandler, CustomFieldUpdateHandler, CustomFieldDeleteHandler,
  ProfileLayoutCreateHandler, ProfileLayoutUpdateHandler, ProfileLayoutDuplicateHandler, ProfileLayoutDeleteHandler, ProfileLayoutAssignRoleHandler,
];

@Module({
  providers: [
    ...HANDLERS,
    { provide: CrmMembers, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new CrmMembers(p) : null) },
    {
      provide: CrmReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CrmMembers, CLOCK],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, m: CrmMembers | null, c: Clock) => (r && p && m ? new CrmReadService(r, p, m, () => c.now()) : null),
    },
    { provide: ContactIdentityService, useValue: new ContactIdentityService() },
  ],
  exports: [CrmMembers, CrmReadService, ContactIdentityService],
})
export class CrmModule {}
