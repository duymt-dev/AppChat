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
  /** Khoá vai trò của người dùng (`owner` / roleKey) — quyền thấy / ghi trường tuỳ biến (D56). Vắng → chỉ Owner được hết. */
  role?: string;
  /** Phiên Trợ lý hiện hành (TIP-023d §1.4) — tool `plan` alias dùng làm `session_id` khi gọi assistant.plan_propose; không phải mọi
   *  ngữ cảnh đều có (sửa thẻ xem trước không liên quan phiên plan). */
  sessionId?: string;
}
