// Controller HTTP của domain `ai` (TIP-019): /v1/settings/ai, /v1/runs. TIP-020 kb, TIP-021 agents / approvals / governance; TIP 022–023,
// 035, 043 thêm assistant / tasks.
// Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như billing / channels / inbox.
import { Module, type DynamicModule } from '@nestjs/common';
import { AiModule, BillingModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { AiController } from './ai.controller';
import { AgentsController } from './agents.controller';

@Module({ imports: [AiModule] })
export class AiHttpModule {
  static register(): DynamicModule {
    return { module: AiHttpModule, imports: [AiModule, BillingModule, ActorModule], controllers: [AiController, AgentsController] };
  }
}
