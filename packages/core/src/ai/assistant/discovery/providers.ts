// Facade đăng ký handler discovery (TIP-023e) — AiModule import danh sách này, tránh phải sửa ai.module.ts mỗi lần thêm handler
// pha sau (build processor/queue không là ActionHandler — chỉ prepare.handler.ts đăng ký ở đây).
import { AssistantDiscoveryPrepareHandler } from './prepare.handler';

export const ASSISTANT_DISCOVERY_PROVIDERS = [AssistantDiscoveryPrepareHandler] as const;
