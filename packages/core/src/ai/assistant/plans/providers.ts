// Facade đăng ký handler plan (TIP-023d) — AiModule import danh sách này, tránh phải sửa ai.module.ts mỗi lần thêm handler pha sau.
import { Inject, Optional, type OnModuleInit } from '@nestjs/common';
import { ActionExecutor } from '../../../kernel/actions/executor';
import { AssistantAgentChoicesHandler } from './agent-choices';
import { planExecutionBinding } from './bindings';
import { AssistantPlanRequestEditHandler, AssistantPlanResumeHandler, AssistantPlanUpdateHandler } from './control.handlers';
import { AssistantPlanProposeHandler } from './handlers';
import { AssistantPlanGetHandler, AssistantPlanReusableHandler } from './read';

/** Gắn port ràng buộc bước kế hoạch vào executor lúc boot (TIP-023d §2.3, mirror ApprovalsInstaller) — mọi tiến trình nạp AiModule. */
export class PlanBindingInstaller implements OnModuleInit {
  constructor(@Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined) {}

  onModuleInit(): void {
    this.executor?.setExecutionBinding(planExecutionBinding);
  }
}

export const ASSISTANT_PLAN_PROVIDERS = [AssistantPlanProposeHandler, AssistantPlanGetHandler, AssistantPlanReusableHandler, AssistantAgentChoicesHandler, AssistantPlanRequestEditHandler, AssistantPlanUpdateHandler, AssistantPlanResumeHandler, PlanBindingInstaller] as const;
