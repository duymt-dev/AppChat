// Controller HTTP của domain `insights` (TIP-038): GET /v1/insights/:metric, /v1/agents/:id/stats, /v1/dashboard. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`).
import { Module, type DynamicModule } from '@nestjs/common';
import { InsightsModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { InsightsController } from './insights.controller';
import { DashboardController } from './dashboard.controller';

@Module({ imports: [InsightsModule] })
export class InsightsHttpModule {
  static register(): DynamicModule {
    return { module: InsightsHttpModule, imports: [InsightsModule, ActorModule], controllers: [InsightsController, DashboardController] };
  }
}
