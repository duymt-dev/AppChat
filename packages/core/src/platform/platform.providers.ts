// Provider của domain `platform` (TIP-040): handler action quản trị + dịch vụ đọc cấu hình cho controller /v1/admin/*.
import type { Provider } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { PLATFORM_DB } from '../kernel/tenant/tenant.providers';
import { AdminPlanUpsertHandler } from './actions/plan.handler';
import { AdminModelPriceUpsertHandler, AdminModelRouteUpsertHandler } from './actions/model.handlers';
import { AdminAgentTemplateUpsertHandler } from './actions/template.handler';
import { AdminLlmProviderDisableHandler, AdminLlmProviderProbeHandler, AdminLlmProviderUpsertHandler, PROVIDER_URL_POLICY } from './actions/provider.handlers';
import { ConfigReadService } from './services/config-read';
import { TransfersReadService } from './services/transfers-read';
import { AdminBankTransactionMatchHandler } from './actions/reconcile-transfer.handler';
import { providerUrlPolicy } from './services/provider-url';
import { ENV_SOURCE } from '../kernel/env-source';

export const PLATFORM_HANDLERS: Provider[] = [
  AdminPlanUpsertHandler,
  AdminModelPriceUpsertHandler,
  AdminModelRouteUpsertHandler,
  AdminAgentTemplateUpsertHandler,
  AdminLlmProviderUpsertHandler,
  AdminLlmProviderProbeHandler,
  AdminLlmProviderDisableHandler,
  AdminBankTransactionMatchHandler,
];

export const PLATFORM_PROVIDERS: Provider[] = [
  // Allowlist host nội bộ của TRIỂN KHAI (env `LLM_PRIVATE_HOSTS`) — không đến từ input admin.
  { provide: PROVIDER_URL_POLICY, inject: [{ token: ENV_SOURCE, optional: true }], useFactory: (src?: Record<string, string | undefined>) => providerUrlPolicy(src ?? {}) },
  { provide: TransfersReadService, inject: [{ token: PLATFORM_DB, optional: true }], useFactory: (p?: PlatformDb) => (p ? new TransfersReadService(p) : null) },
  { provide: ConfigReadService, inject: [{ token: PLATFORM_DB, optional: true }], useFactory: (p?: PlatformDb) => (p ? new ConfigReadService(p) : null) },
];
