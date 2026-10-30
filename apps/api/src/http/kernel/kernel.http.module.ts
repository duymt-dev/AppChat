// Route kernel (TIP-003): actions + action-logs. Chỉ đăng ký khi kernel có Action executor (env DB + Redis).
import { Module, type DynamicModule } from '@nestjs/common';
import { ActionsController } from './actions.controller';
import { ACTOR_RESOLVER, DevActorResolver, type ActorResolver } from './request-actor';

export const DEV_MEMBERS = new Map<string, Set<string>>();

@Module({})
export class KernelHttpModule {
  static register(actors: ActorResolver = new DevActorResolver(DEV_MEMBERS)): DynamicModule {
    return { module: KernelHttpModule, controllers: [ActionsController], providers: [{ provide: ACTOR_RESOLVER, useValue: actors }] };
  }
}
