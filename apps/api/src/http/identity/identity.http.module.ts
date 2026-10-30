// Controller HTTP của domain `identity` (TIP-004): /v1/auth/*, /v1/me, /v1/workspaces, /v1/business-lookup;
// TIP-011: /v1/session, /v1/workspace/provisioning, /v1/auth/brand.
// Controller chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`); thiếu env → module rỗng (vd. test health).
import { Module, type DynamicModule } from '@nestjs/common';
import { BillingModule, IdentityModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { AuthController } from './auth.controller';
import { SessionController } from './session.controller';
import { WorkspacesController } from './workspaces.controller';

@Module({ imports: [IdentityModule] })
export class IdentityHttpModule {
  static register(): DynamicModule {
    return { module: IdentityHttpModule, imports: [IdentityModule, BillingModule, ActorModule], controllers: [AuthController, WorkspacesController, SessionController] };
  }
}
