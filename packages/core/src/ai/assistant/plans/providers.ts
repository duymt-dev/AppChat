// Facade đăng ký handler plan (TIP-023d) — AiModule import danh sách này, tránh phải sửa ai.module.ts mỗi lần thêm handler pha sau.
import { AssistantAgentChoicesHandler } from './agent-choices';
import { AssistantPlanProposeHandler } from './handlers';
import { AssistantPlanGetHandler, AssistantPlanReusableHandler } from './read';

export const ASSISTANT_PLAN_PROVIDERS = [AssistantPlanProposeHandler, AssistantPlanGetHandler, AssistantPlanReusableHandler, AssistantAgentChoicesHandler] as const;
