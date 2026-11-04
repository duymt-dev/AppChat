// Hàng chờ "AI đã học — chờ duyệt" (TIP-043, Blueprint §4.4 `GET /v1/kb/suggestions?status=&cursor=&limit=` + `/:id`): hỏi–đáp đã che
// PII, trạng thái + version (CAS cho kb.suggestion.approve / reject). Liên kết hội thoại gốc (`conversation_id`, `source_message_ids`) chỉ
// có khi người xem có quyền inbox thấy được hội thoại đó — người chỉ có `kb.manage` nhận `null` / mảng rỗng.
import { z } from 'zod';

export const KB_SUGGESTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const KB_SUGGESTION_LIMITS = { question: 200, answer: 5000, reason: 300, page: 100 } as const;

export const kbSuggestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  status: z.enum(KB_SUGGESTION_STATUSES),
  edited: z.boolean(),
  version: z.number().int(),
  created_at: z.string(),
  reviewed_at: z.string().nullable(),
  reviewed_by_name: z.string().nullable(),
  reject_reason: z.string().nullable(),
  kb_source_id: z.string().nullable(),
  /** Trạng thái nạp của nguồn đã duyệt (pending / processing / ready / failed) — không đồng nghĩa "đã học" trước khi ready. */
  source_status: z.enum(['pending', 'processing', 'ready', 'failed']).nullable(),
  conversation_id: z.string().nullable(),
  source_message_ids: z.array(z.string()),
});
export type KbSuggestionDto = z.infer<typeof kbSuggestionSchema>;

export const kbSuggestionListSchema = z.object({
  data: z.array(kbSuggestionSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ pending: z.number().int() }),
});
export type KbSuggestionListDto = z.infer<typeof kbSuggestionListSchema>;
