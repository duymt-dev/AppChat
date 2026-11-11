// Sự kiện yêu cầu dựng kho mô tả action theo ngữ nghĩa (TIP-023e §1.4, §4.4): phát khi `assistant.discovery_prepare` giành được
// lease dựng MỚI (không phát khi chỉ đọc lại generation đã có — tránh dispatch trùng batch). Payload CHỈ id — không corpus, không
// văn bản mô tả (những thứ đó đọc lại từ DB bằng generation_id, consumer không cần biết gì khác để enqueue đúng việc).
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };

export const assistantDiscoveryRequestedEvent = z.object({
  ...base,
  generation_id: z.string().uuid(),
  corpus_hash: z.string(),
  embedding_space: z.string(),
});
export type AssistantDiscoveryRequestedEvent = z.infer<typeof assistantDiscoveryRequestedEvent>;

export const ACTION_DISCOVERY_EVENT_SCHEMAS = {
  'assistant.discovery_requested': assistantDiscoveryRequestedEvent,
} as const;
