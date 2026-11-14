// Event đề xuất tri thức (TIP-043, Blueprint §2.3 `kb.suggestion_created`): chỉ id — thông báo / WS cho người có `kb.manage` không mang
// hỏi–đáp hay PII. `kb.suggestion_approved` → consumer đẩy `kb-ingest` cho nguồn vừa tạo sau commit (Redis lỗi vẫn còn event để thử lại).
// `kb.suggestion_requested` → job đề xuất (ROLE=ai) — mốc tin cuối đã chụp lúc đóng hội thoại.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };

export const kbSuggestionCreatedEvent = z.object({ ...base, suggestion_ids: z.array(z.string().uuid()).min(1).max(5), conversation_id: z.string().uuid() });
export const kbSuggestionApprovedEvent = z.object({ ...base, suggestion_id: z.string().uuid(), source_id: z.string().uuid(), ingest_seq: z.number().int() });
export const kbSuggestionRejectedEvent = z.object({ ...base, suggestion_id: z.string().uuid() });

export const KB_SUGGESTION_EVENT_SCHEMAS = {
  'kb.suggestion_created': kbSuggestionCreatedEvent,
  'kb.suggestion_approved': kbSuggestionApprovedEvent,
  'kb.suggestion_rejected': kbSuggestionRejectedEvent,
} as const;
