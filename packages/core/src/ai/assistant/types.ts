// Ngữ cảnh một lượt Trợ lý dùng chung giữa meta-tools và delegate (tách riêng để không vòng import).
import type { AuthzContext } from '@appchat/shared';
import type { AssistantMode } from './catalog';

export interface AssistantTurnCtx {
  ws: string;
  runId: string;
  userId: string;
  authz: AuthzContext;
  mode: AssistantMode;
  locale: string;
}
