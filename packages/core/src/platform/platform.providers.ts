// Provider của domain `platform` (TIP-040): handler action quản trị + dịch vụ đọc cấu hình cho controller /v1/admin/*.
import type { Provider } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { PLATFORM_DB } from '../kernel/tenant/tenant.providers';
import { AdminPlanUpsertHandler } from './actions/plan.handler';
import { AdminModelPriceUpsertHandler, AdminModelRouteUpsertHandler } from './actions/model.handlers';
import { AdminAgentTemplateUpsertHandler } from './actions/template.handler';
import { ConfigReadService } from './services/config-read';

export const PLATFORM_HANDLERS: Provider[] = [AdminPlanUpsertHandler, AdminModelPriceUpsertHandler, AdminModelRouteUpsertHandler, AdminAgentTemplateUpsertHandler];

export const PLATFORM_PROVIDERS: Provider[] = [
  { provide: ConfigReadService, inject: [{ token: PLATFORM_DB, optional: true }], useFactory: (p?: PlatformDb) => (p ? new ConfigReadService(p) : null) },
];
