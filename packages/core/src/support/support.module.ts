// Domain `support` (TIP-034): ticket, chính sách SLA mặc định, đồng hồ SLA, leo thang — 10 handler (ticket.* + sla.update_default) + từ
// điển gợi ý danh mục (TIP-034b, categories/) + sửa hàng loạt có biên nhận / hoàn tác có canh gác (TIP-034c, bulk/), đọc
// /v1/tickets* (TicketsReadService), luật thông báo / realtime (events/support.rules.ts), seed chính sách mặc định, job quét SLA +
// consumer tin nhắn (jobs/support.jobs.module.ts).
import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { ChannelsModule } from '../channels/channels.module';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { IdentityModule } from '../identity/identity.module';
import { SettingsReadService } from '../identity/public';
import './events/support.rules';
import './categories/events';
import './seeds';
import { TicketCreateHandler } from './actions/ticket-create.handler';
import { TicketAssignHandler, TicketCommentHandler, TicketUpdateHandler } from './actions/ticket-edit.handlers';
import { TicketCloseHandler, TicketReopenHandler, TicketSetStatusHandler } from './actions/ticket-flow.handlers';
import { SlaUpdateDefaultHandler, TicketSearchHandler } from './actions/sla-config.handlers';
import { SlaCalendar } from './services/sla-clock';
import { TicketsReadService } from './services/tickets-read.service';

import { TicketGetHandler } from './actions/ticket-read.handlers';
import { registerSystemVerifier } from '../kernel/actions/system';
import { TicketSystemTransitionHandler } from './system/handlers';
import { verifyTicketTrigger } from './system/sources';
import { CATEGORY_PROVIDERS } from './categories/providers';
import { TicketCategoriesRead } from './categories/read';
import { AuthzModule } from '../authz/authz.module';
import { DataJobActionsModule } from '../kernel/jobs/data-jobs/data-jobs.module';
import { TicketBulkUpdateHandler } from './bulk/parent';
import { TicketBulkItemHandler } from './bulk/item';
import { TicketBulkItemUndoHandler, TicketBulkUndoHandler } from './bulk/undo';
import { TICKET_BULK_DEPS, TicketBulkDeps } from './bulk/providers';
import { registerTicketBulk } from './bulk/register';

const HANDLERS = [
  TicketSearchHandler, TicketCreateHandler, TicketUpdateHandler, TicketAssignHandler, TicketSetStatusHandler,
  TicketCommentHandler, TicketCloseHandler, TicketReopenHandler, TicketBulkUpdateHandler, SlaUpdateDefaultHandler,
  TicketGetHandler,
  // Action riêng chuyển trạng thái hệ thống (TIP-003c).
  TicketSystemTransitionHandler,
  // TIP-034c: sửa hàng loạt có biên nhận + hoàn tác có canh gác (cha công khai + con riêng).
  TicketBulkUndoHandler, TicketBulkItemHandler, TicketBulkItemUndoHandler,
];

@Module({
  imports: [CrmModule, ChannelsModule, IdentityModule, AuthzModule, DataJobActionsModule],
  providers: [
    ...HANDLERS,
    // TIP-034b: từ điển gợi ý danh mục ticket (3 action + ký cursor + đọc cho controller).
    ...CATEGORY_PROVIDERS,
    TICKET_BULK_DEPS,
    SlaCalendar,
    {
      provide: TicketsReadService,
      inject: [{ token: TENANT_RESOLVER, optional: true }, SlaCalendar, CrmMembers, CLOCK, { token: SettingsReadService, optional: true }],
      useFactory: (t: TenantDbResolver | undefined, cal: SlaCalendar, m: CrmMembers, c: Clock, st: SettingsReadService | undefined) =>
        t ? new TicketsReadService(t, cal, m, () => c.now(), st ?? null) : null,
    },
  ],
  exports: [SlaCalendar, TicketsReadService, TicketCategoriesRead, TicketBulkDeps],
})
export class SupportModule implements OnModuleInit {
  constructor(@Inject(TicketBulkDeps) private readonly bulk: TicketBulkDeps) {}

  /** TIP-003c: verifier nguồn của action riêng `ticket.system_transition`. TIP-034c: verifier / map hoàn tác / kind việc của sửa hàng loạt. */
  onModuleInit(): void {
    registerSystemVerifier('ticket.system_transition', verifyTicketTrigger);
    registerTicketBulk(this.bulk);
  }
}
