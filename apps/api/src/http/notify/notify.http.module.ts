// HTTP + realtime của domain `notify` (TIP-006): GET /v1/notifications, /v1/settings/notifications, Socket.IO `/ws`.
// Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như identity / authz.
import { Module, type DynamicModule } from '@nestjs/common';
import { AuthzModule, IdentityModule, NotifyModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { NotifyController } from './notify.controller';
import { RealtimeGateway } from './realtime/ws.gateway';

@Module({ imports: [NotifyModule] })
export class NotifyHttpModule {
  static register(): DynamicModule {
    return {
      module: NotifyHttpModule,
      imports: [NotifyModule, AuthzModule, IdentityModule, ActorModule],
      controllers: [NotifyController],
      providers: [RealtimeGateway],
    };
  }
}
