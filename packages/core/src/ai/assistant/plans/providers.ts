// Facade đăng ký handler plan (TIP-023d) — AiModule import danh sách này, tránh phải sửa ai.module.ts mỗi lần thêm handler pha sau.
import { AssistantPlanProposeHandler } from './handlers';
import { AssistantPlanGetHandler, AssistantPlanReusableHandler } from './read';

export const ASSISTANT_PLAN_PROVIDERS = [AssistantPlanProposeHandler, AssistantPlanGetHandler, AssistantPlanReusableHandler] as const;
