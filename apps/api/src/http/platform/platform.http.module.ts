// Controller HTTP của domain `platform` (TIP-040): /v1/admin/session + màn quản trị nền tảng. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET
// (`register`) — như identity / authz / billing.
import { Module, type DynamicModule } from '@nestjs/common';
import { PlatformModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { AdminSessionController } from './admin-session.controller';
import { AdminConfigController } from './config.controller';
// Đối soát chuyển khoản (TIP-010) ở file cũ của billing — gắn vào module platform vì đọc qua TransfersReadService (TIP-040).
import { AdminTransfersController } from '../billing/admin-transfers.controller';

@Module({ imports: [PlatformModule] })
export class PlatformHttpModule {
  static register(): DynamicModule {
    return { module: PlatformHttpModule, imports: [PlatformModule, ActorModule], controllers: [AdminSessionController, AdminConfigController, AdminTransfersController] };
  }
}
