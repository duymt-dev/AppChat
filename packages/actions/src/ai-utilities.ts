// Kỹ năng tiện ích AI chỉ đọc (TIP-019c §1, Blueprint §3.4 L797): tóm tắt / nhận diện ý định / trích thông tin / đánh giá độ phù hợp
// cơ hội. risk read + skill — quyền `assistant.use` (dùng Trợ lý), MỖI nguồn tham chiếu còn đòi quyền đọc domain gốc + scope hiện tại
// (inbox.view / crm.view). Cấp kỹ năng cho agent KHÔNG kéo theo quyền đọc domain. Kết quả là đề xuất có bằng chứng — không ghi nghiệp vụ.
import { defineAction } from './define';
import { detectIntentInput, extractInfoInput, scoreLeadInput, summarizeInput, utilityEnvelope } from '@appchat/shared';

const common = { module: 'ai' as const, permission: 'assistant.use' as const, risk: 'read' as const, agentGrantable: true, skill: true, invalidates: [] as string[] };

export const aiSummarize = defineAction({
  id: 'ai.summarize',
  ...common,
  title: 'actions.ai.summarize.title',
  description:
    'Summarize one source (pasted text, selected messages of a conversation, or a contact) into a short summary + bullets with cited evidence. Read-only proposal, never saved to CRM. Example: {"source":{"kind":"conversation","conversation_id":"c_lan","message_ids":["m1","m2"]},"max_bullets":5}',
  input: summarizeInput,
  output: utilityEnvelope,
});

export const aiDetectIntent = defineAction({
  id: 'ai.detect_intent',
  ...common,
  title: 'actions.ai.detect_intent.title',
  description:
    'Detect the intent of one source with an optional taxonomy (default: inquiry, booking, purchase_interest, payment_question, complaint, cancellation, other). Returns one label or unknown + model confidence (an estimate, not a probability). Never routes or closes anything. Example: {"source":{"kind":"text","text":"Cho mình hỏi giá gói 10 buổi"}}',
  input: detectIntentInput,
  output: utilityEnvelope,
});

export const aiExtractInfo = defineAction({
  id: 'ai.extract_info',
  ...common,
  title: 'actions.ai.extract_info.title',
  description:
    'Extract declared fields (string | number | boolean | date | enum | money VND) from one source with evidence; missing / ambiguous / invalid are explicit, never guessed. Never writes to contacts, orders or payments. Example: {"source":{"kind":"text","text":"Đặt cọc 500.000đ ngày 2026-11-20"},"fields":[{"key":"deposit","label":"Tiền cọc","type":"money","currency":"VND"},{"key":"date","label":"Ngày","type":"date"}]}',
  input: extractInfoInput,
  output: utilityEnvelope,
});

export const aiScoreLead = defineAction({
  id: 'ai.score_lead',
  ...common,
  title: 'actions.ai.score_lead.title',
  description:
    'Advisory opportunity-fit assessment of a contact (rubric: buying_intent, service_need, timing, engagement — 0..25 each) from CRM facts and optionally selected messages of their conversation. Score only when all 4 criteria have evidence, else insufficient_evidence. Not a conversion probability or credit decision; never changes the contact score. Example: {"contact_id":"…","conversation_id":"…","message_ids":["…"]}',
  input: scoreLeadInput,
  output: utilityEnvelope,
});
