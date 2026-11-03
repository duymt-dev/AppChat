// Client lượt Trợ lý dùng chung (Blueprint §4.5, TIP-023c G2): màn Trợ lý, drawer theo màn và Dock gửi cùng một hợp đồng — shared không
// import features/assistant. `request_id` mỗi lượt (gửi lại do mạng → cùng run); `context.surface` chọn cây gọn (drawer) / đầy đủ.
import type { AssistantConfirmDto, AssistantTurnDto } from '@appchat/shared';
import { transport } from '../api/client';

export type AssistantMode = 'chat' | 'cowork';
export type AssistantSurface = 'drawer' | 'assistant';

/** Ngữ cảnh màn gửi kèm lượt — gợi ý, KHÔNG phải quyền: server tự kiểm scope (hợp đồng 8). */
export interface ScreenContext {
  route: string;
  entity?: string;
  id?: string;
  selection?: string[];
  surface?: AssistantSurface;
}

export interface TurnRequest {
  text: string;
  mode: AssistantMode;
  sessionId?: string;
  tier?: string;
  context?: ScreenContext;
  requestId?: string;
}

export const newRequestId = () => `req-${crypto.randomUUID()}`;

export const postTurn = (q: TurnRequest) =>
  transport.post<AssistantTurnDto>('/assistant/messages', {
    text: q.text,
    mode: q.mode,
    session_id: q.sessionId,
    tier: q.tier,
    context: q.context,
    request_id: q.requestId ?? newRequestId(),
  });

export const postConfirm = (token: string, decision: 'confirm' | 'cancel') => transport.post<AssistantConfirmDto>('/assistant/confirm', { confirm_token: token, decision });
