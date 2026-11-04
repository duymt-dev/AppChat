// Route kernel (TIP-003): actions + action-logs; audit workspace (TIP-045b). Chỉ đăng ký khi kernel có Action executor (env DB + Redis).
// Người gọi = JwtActorResolver (TIP-004) từ module identity.
import { Module, type DynamicModule } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ActionsController } from './actions.controller';
import { ActorModule } from './actor.module';
import { AuditController } from './audit.controller';

@Module({})
export class KernelHttpModule {
  static register(): DynamicModule {
    return { module: KernelHttpModule, imports: [ActorModule], controllers: [ActionsController, MetricsController, AuditController] };
  }
}
