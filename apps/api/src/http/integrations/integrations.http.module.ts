// Controller HTTP của domain `integrations` (TIP-012): GET /v1/settings/integrations, POST /hooks/integrations/:connector/:connectionId.
// Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như identity / authz / notify / billing.
import { Module, type DynamicModule } from '@nestjs/common';
import { IntegrationsModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { IntegrationHooksController } from './hooks.controller';
import { IntegrationsController } from './integrations.controller';

@Module({ imports: [IntegrationsModule] })
export class IntegrationsHttpModule {
  static register(): DynamicModule {
    return { module: IntegrationsHttpModule, imports: [IntegrationsModule, ActorModule], controllers: [IntegrationsController, IntegrationHooksController] };
  }
}
