// Ngữ cảnh một lượt Trợ lý dùng chung giữa meta-tools và delegate (tách riêng để không vòng import).
import type { AuthzContext } from '@appchat/shared';
import type { AssistantMode } from './catalog';
import type { SelectedAgent } from './plans/selected-agent';

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
  /** TIP-023d §5: agent người dùng chọn (id + bản đã ghim lúc nhận lượt) — server dựng lại từ ai_run.input, không từ model. */
  selected?: SelectedAgent;
  /** TIP-006c: tab trình duyệt đã gửi lượt (`ai_run.input.tab_id`) — tool `ui` phát `ui.command` chỉ tới tab này. */
  tabId?: string;
}
