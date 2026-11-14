// Controller HTTP của domain `authz` (TIP-005): /v1/me/authz, /v1/roles, /v1/permissions, /v1/teams.
// Controller chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như identity.
import { Module, type DynamicModule } from '@nestjs/common';
import { AuthzModule, IdentityModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { AuthzController } from './authz.controller';

@Module({ imports: [AuthzModule] })
export class AuthzHttpModule {
  static register(): DynamicModule {
    return { module: AuthzHttpModule, imports: [AuthzModule, IdentityModule, ActorModule], controllers: [AuthzController] };
  }
}
