// Domain `support` (TIP-034): ticket, chính sách SLA mặc định, đồng hồ SLA, leo thang — 10 handler (ticket.* + sla.update_default), đọc
// /v1/tickets* (TicketsReadService), luật thông báo / realtime (events/support.rules.ts), seed chính sách mặc định, job quét SLA +
// consumer tin nhắn (jobs/support.jobs.module.ts).
import { Module } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { ChannelsModule } from '../channels/channels.module';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { IdentityModule } from '../identity/identity.module';
import { SettingsReadService } from '../identity/public';
import './events/support.rules';
import './seeds';
import { TicketCreateHandler } from './actions/ticket-create.handler';
import { TicketAssignHandler, TicketBulkUpdateHandler, TicketCommentHandler, TicketUpdateHandler } from './actions/ticket-edit.handlers';
import { TicketCloseHandler, TicketReopenHandler, TicketSetStatusHandler } from './actions/ticket-flow.handlers';
import { SlaUpdateDefaultHandler, TicketSearchHandler } from './actions/sla-config.handlers';
import { SlaCalendar } from './services/sla-clock';
import { TicketsReadService } from './services/tickets-read.service';

const HANDLERS = [
  TicketSearchHandler, TicketCreateHandler, TicketUpdateHandler, TicketAssignHandler, TicketSetStatusHandler,
  TicketCommentHandler, TicketCloseHandler, TicketReopenHandler, TicketBulkUpdateHandler, SlaUpdateDefaultHandler,
];

@Module({
  imports: [CrmModule, ChannelsModule, IdentityModule],
  providers: [
    ...HANDLERS,
    SlaCalendar,
    {
      provide: TicketsReadService,
      inject: [{ token: TENANT_RESOLVER, optional: true }, SlaCalendar, CrmMembers, CLOCK, { token: SettingsReadService, optional: true }],
      useFactory: (t: TenantDbResolver | undefined, cal: SlaCalendar, m: CrmMembers, c: Clock, st: SettingsReadService | undefined) =>
        t ? new TicketsReadService(t, cal, m, () => c.now(), st ?? null) : null,
    },
  ],
  exports: [SlaCalendar, TicketsReadService],
})
export class SupportModule {}
