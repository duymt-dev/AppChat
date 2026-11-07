// Domain `crm` (TIP-015): khách hàng, phụ trách + đồng phụ trách + xin chia sẻ (D32), gộp trùng, liên kết khách theo kênh (C06),
// trường tuỳ biến (D56), bố cục Hồ sơ 360° (F12), xuất / nhập. Seed mặc định đăng ký khi nạp `seeds.ts`. Thiếu DB → service null.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { fileLinksFrom } from '../kernel/files/file-links';
import './seeds';
import { ContactAddCollaboratorHandler, ContactDecideAccessHandler, ContactRemoveCollaboratorHandler, ContactRequestAccessHandler, ContactTransferOwnerHandler } from './actions/contact-owner.handlers';
import { ContactExportHandler, ContactImportHandler } from './actions/contact-io.handlers';
import { ContactMergeHandler } from './actions/contact-merge.handler';
import { ContactCreateHandler, ContactDeleteHandler, ContactSetStageHandler, ContactTagHandler, ContactUpdateHandler } from './actions/contact-write.handlers';
import { ContactSearchHandler } from './actions/contact-search.handler';
import { ContactEditContextHandler } from './actions/contact-edit-read.handler';
import { ContactTimelineExportHandler } from './actions/contact-timeline-export.handler';
import { ContactGet360Handler, ContactGetHandler, ProfileLayoutSearchHandler } from './actions/contact-read.handlers';
import { CustomFieldDefineHandler, CustomFieldDeleteHandler, CustomFieldUpdateHandler } from './actions/custom-field.handlers';
import { ProfileLayoutAssignRoleHandler, ProfileLayoutCreateHandler, ProfileLayoutDeleteHandler, ProfileLayoutDuplicateHandler, ProfileLayoutUpdateHandler } from './actions/profile-layout.handlers';
import { ContactMemoryModule } from './memory/memory.module';
import { DataJobActionsModule } from '../kernel/jobs/data-jobs/data-jobs.module';
import { ContactBulkUpdateHandler } from './actions/contact-bulk.handler';
import { CrmReadService } from './services/crm-read.service';
import { ContactIdentityService } from './services/identity.service';
import { CrmMembers } from './services/members.service';
import { ROUTING_PROVIDERS } from './routing/routing.providers';
import { LeadRoutingReadService } from './routing/routing-read.service';

const opt = (token: symbol) => ({ token, optional: true });

const HANDLERS = [
  ContactSearchHandler,
  ContactEditContextHandler,
  ContactTimelineExportHandler,
  ContactGetHandler,
  ContactGet360Handler,
  ContactCreateHandler, ContactUpdateHandler, ContactSetStageHandler, ContactTagHandler, ContactDeleteHandler, ContactMergeHandler,
  ContactAddCollaboratorHandler, ContactRemoveCollaboratorHandler, ContactTransferOwnerHandler, ContactRequestAccessHandler, ContactDecideAccessHandler,
  ContactExportHandler, ContactImportHandler,
  // TIP-045b annex D: sửa hàng loạt (≤ 50 ngay, > 50 việc nền).
  ContactBulkUpdateHandler,
  CustomFieldDefineHandler, CustomFieldUpdateHandler, CustomFieldDeleteHandler,
  ProfileLayoutSearchHandler, ProfileLayoutCreateHandler, ProfileLayoutUpdateHandler, ProfileLayoutDuplicateHandler, ProfileLayoutDeleteHandler, ProfileLayoutAssignRoleHandler,
];

@Module({
  imports: [ContactMemoryModule, DataJobActionsModule],
  providers: [
    ...HANDLERS,
    { provide: CrmMembers, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new CrmMembers(p) : null) },
    {
      provide: CrmReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CrmMembers, CLOCK, opt(ENV_SOURCE), opt(ENC_KEY)],
      // Ảnh đại diện đồng bộ từ kênh (TIP-014b D) trả link ký cùng origin API public như tệp đính kèm.
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, m: CrmMembers | null, c: Clock, src?: Record<string, string | undefined>, key?: Buffer) =>
        r && p && m ? new CrmReadService(r, p, m, () => c.now(), fileLinksFrom(src ?? {}, key)) : null,
    },
    { provide: ContactIdentityService, useValue: new ContactIdentityService() },
    // TIP-042b: chia lead mới (rule + apply system + đọc cấu hình).
    ...ROUTING_PROVIDERS,
  ],
  exports: [CrmMembers, CrmReadService, ContactIdentityService, LeadRoutingReadService, DataJobActionsModule],
})
export class CrmModule {}
