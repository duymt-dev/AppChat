// Handler domain cho worker ROLE=ai (TIP-023b "Rà trước khi làm"): `ai-resume` / agent trực kênh / tác vụ tự chủ chạy action qua cùng
// ActionExecutor với API — thiếu module domain thì handler là NOT_IMPLEMENTED → chạy tiếp sau duyệt trả 501. Danh sách = mọi module domain
// có @ActionHandler mà API nạp (apps/api app.module withActions), trừ module chỉ HTTP. Test `apps/worker/test/ai-role-handlers.test.ts`
// so tập action có handler thật ở worker với API (boot module thật, không mock registry).
import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { BookingModule } from '../../booking/booking.module';
import { CatalogModule } from '../../catalog/catalog.module';
import { ChannelsModule } from '../../channels/channels.module';
import { ContractsModule } from '../../contracts/contracts.module';
import { CrmModule } from '../../crm/crm.module';
import { DocumentsModule } from '../../documents/documents.module';
import { IdentityModule } from '../../identity/identity.module';
import { InboxModule } from '../../inbox/inbox.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { NotifyModule } from '../../notify/notify.module';
import { SalesModule } from '../../sales/sales.module';
import { SupportModule } from '../../support/support.module';

/** Module domain có handler action — cùng tập API nạp. */
export const AI_DOMAIN_MODULES = [
  IdentityModule,
  BillingModule,
  ChannelsModule,
  InboxModule,
  CrmModule,
  CatalogModule,
  SalesModule,
  ContractsModule,
  DocumentsModule,
  IntegrationsModule,
  BookingModule,
  SupportModule,
  NotifyModule,
];

@Module({ imports: AI_DOMAIN_MODULES })
export class AiDomainHandlersModule {}
