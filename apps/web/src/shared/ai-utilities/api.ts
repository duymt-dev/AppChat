// Đọc kết quả kỹ năng tiện ích (TIP-019c §3.4): GET /v1/ai-utilities/:runId/result — chỉ đề xuất đã kiểm, không chữ thô.
// Ghi (gọi kỹ năng) luôn qua useAction (đường ghi duy nhất) — file này chỉ đọc + nguồn tin chọn từ reader Hộp thư sẵn có.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '../api/client';
import type { UtilityEnvelope } from './types';

export const utilityKeys = {
  result: (runId: string) => ['ai-utilities', 'result', runId] as const,
  messages: (conversationId: string) => ['ai-utilities', 'messages', conversationId] as const,
};

export const utilityResultQuery = (runId: string) =>
  queryOptions({ queryKey: utilityKeys.result(runId), queryFn: () => transport.get<UtilityEnvelope>(`/ai-utilities/${runId}/result`) });

export interface MessageChoice {
  id: string;
  text: string;
  sender: string;
  time: string;
}

/** Khuôn tối thiểu của tin từ reader Hộp thư sẵn có (shared không import features). */
interface ThreadMessage {
  id: string;
  kind: string;
  body?: string;
  sender?: string;
  direction?: 'in' | 'out';
  time?: string;
}

/** Tin chữ gần nhất (tối đa 30 — giới hạn nguồn §5) của hội thoại người dùng đang thấy; chỉ để chọn, không gửi model. */
export const messageChoicesQuery = (conversationId: string) =>
  queryOptions({
    queryKey: utilityKeys.messages(conversationId),
    queryFn: async (): Promise<MessageChoice[]> => {
      const r = await transport.get<{ data: ThreadMessage[] }>(`/conversations/${conversationId}/messages`);
      return (r.data ?? [])
        .filter((m) => m.kind === 'text' && (m.body ?? '').trim())
        .slice(-30)
        .map((m) => ({ id: m.id, text: (m.body ?? '').slice(0, 140), sender: m.sender ?? (m.direction === 'out' ? 'out' : 'in'), time: m.time ?? '' }));
    },
  });
