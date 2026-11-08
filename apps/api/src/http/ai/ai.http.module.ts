// Controller HTTP của domain `ai` (TIP-019): /v1/settings/ai, /v1/runs. TIP-020 kb, TIP-021 agents / approvals / governance; TIP-023 Trợ lý
// (assistant/*, action-logs); TIP-035 ai-tasks; TIP-020b tải nguồn KB; TIP-043 hàng chờ học từ hội thoại; TIP-019b chi tiết run.
// Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như billing / channels / inbox.
import { Module, type DynamicModule } from '@nestjs/common';
import { AiModule, BillingModule, ChannelsModule, InsightsModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { AiController } from './ai.controller';
import { AgentsController } from './agents.controller';
import { AssistantController } from './assistant.controller';
import { AssistantUiController } from './assistant-ui.controller';
import { AssistantStreamController } from './assistant-stream.controller';
import { AiTasksController } from './tasks.controller';
import { RunsController } from './runs.controller';
import { KbManagementController } from './kb-management.controller';
import { KbSuggestionsController } from './kb-suggestions.controller';

@Module({ imports: [AiModule] })
export class AiHttpModule {
  static register(): DynamicModule {
    return { module: AiHttpModule, imports: [AiModule, BillingModule, ChannelsModule, InsightsModule, ActorModule], controllers: [AiController, AgentsController, AssistantController, AssistantUiController, AssistantStreamController, AiTasksController, KbManagementController, KbSuggestionsController, RunsController] };
  }
}
