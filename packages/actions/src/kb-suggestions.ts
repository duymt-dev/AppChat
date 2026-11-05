// Hàng chờ học từ hội thoại (TIP-043, Blueprint §3.4 `kb.suggestion.*`, rag §9, D29b). `kb.suggestion.propose` system-only: job đề xuất
// (ROLE=ai, actor `system:kb-suggest`) ghi 0–5 cặp pending đã che PII — người / Trợ lý / agent không gọi được (SYSTEM_ONLY + guard actor).
// Người có `kb.manage` sửa rồi `approve` → đúng một nguồn origin conversation; `reject` đóng đề xuất. CAS `if_version` bắt buộc — hai người
// duyệt cùng lúc chỉ một thắng. Không agentGrantable: AI không tự đưa tri thức vào kho.
import { z } from 'zod';
import { defineAction } from './define';

const uuid = z.string().uuid();
const pair = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(5000),
  source_message_ids: z.array(uuid).min(1).max(20),
});

export const kbSuggestionPropose = defineAction({
  id: 'kb.suggestion.propose',
  module: 'ai',
  title: 'actions.kb.suggestion.propose.title',
  description: 'System-only: store knowledge Q&A pairs proposed from a closed conversation (already PII-redacted) as pending suggestions. Not callable by users, assistant or agents.',
  input: z.object({ conversation_id: uuid, cutoff_message_id: uuid, run_id: uuid.nullable(), pairs: z.array(pair).max(5) }),
  output: z.object({ created: z.array(z.string()), duplicates: z.number().int(), skipped: z.string().nullable() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb_suggestions'],
});

export const kbSuggestionApprove = defineAction({
  id: 'kb.suggestion.approve',
  module: 'ai',
  title: 'actions.kb.suggestion.approve.title',
  description:
    'Approve a pending knowledge suggestion (optionally edit the question / answer first) → one knowledge source learned by AI. Visibility omitted = folder default, else public. Example: {"suggestion_id":"…","if_version":1,"answer":"Khách được đổi lịch trước 24 giờ.","folder_id":"…"}',
  input: z
    .object({
      suggestion_id: z.string().min(1),
      if_version: z.number().int().positive(),
      question: z.string().trim().min(1).max(200).optional(),
      answer: z.string().trim().min(1).max(5000).optional(),
      folder_id: z.string().optional(),
      visibility: z.enum(['public', 'internal']).optional(),
    })
    .strict(),
  output: z.object({ suggestion_id: z.string(), status: z.literal('approved'), kb_source_id: z.string() }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb_suggestions', 'kb'],
});

export const kbSuggestionReject = defineAction({
  id: 'kb.suggestion.reject',
  module: 'ai',
  title: 'actions.kb.suggestion.reject.title',
  description: 'Reject a pending knowledge suggestion (nothing is added to the knowledge base). Example: {"suggestion_id":"…","if_version":1,"reason":"Thông tin đã cũ"}',
  input: z.object({ suggestion_id: z.string().min(1), if_version: z.number().int().positive(), reason: z.string().trim().max(300).optional() }).strict(),
  output: z.object({ suggestion_id: z.string(), status: z.literal('rejected') }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb_suggestions'],
});
