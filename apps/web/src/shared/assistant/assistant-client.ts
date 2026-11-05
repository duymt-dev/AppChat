// Client lượt Trợ lý dùng chung (Blueprint §4.5, TIP-023c G2): màn Trợ lý, drawer theo màn và Dock gửi cùng một hợp đồng — shared không
// import features/assistant. `request_id` mỗi lượt (gửi lại do mạng → cùng run); lượt đi qua SSE (turn-stream.ts); `context.surface` chọn cây gọn (drawer) / đầy đủ.
import type { AssistantConfirmDto } from '@appchat/shared';
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
  /** Tệp đã tải (`file_id` + tên) — server kiểm lại bằng guard trước model (TIP-023c 8c). */
  attachments?: { id: string; name: string }[];
}

export const newRequestId = () => `req-${crypto.randomUUID()}`;

export const postConfirm = (token: string, decision: 'confirm' | 'cancel') => transport.post<AssistantConfirmDto>('/assistant/confirm', { confirm_token: token, decision });
