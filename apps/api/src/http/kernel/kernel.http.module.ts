// Route kernel (TIP-003): actions + action-logs; audit workspace (TIP-045b); việc dữ liệu nặng /v1/data-jobs (TIP-045b annex D); tài liệu OpenAPI /v1/docs (TIP-003d). Chỉ đăng ký khi kernel có Action executor (env DB + Redis).
// Người gọi = JwtActorResolver (TIP-004) từ module identity.
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { ActionsController } from './actions.controller';
import { ActorModule } from './actor.module';
import { AuditController } from './audit.controller';
import { DataJobsController } from './data-jobs.controller';
import { OpenApiController } from './openapi.controller';
import { DataJobActionsModule } from '@appchat/core';

@Module({})
export class KernelHttpModule {
  static register(): DynamicModule {
    return { module: KernelHttpModule, imports: [ActorModule, DataJobActionsModule, DiscoveryModule], controllers: [ActionsController, MetricsController, AuditController, DataJobsController, OpenApiController] };
  }
}
