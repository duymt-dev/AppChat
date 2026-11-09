// Kiểu FE của 4 kỹ năng tiện ích AI chỉ đọc (TIP-019c §1, §4): lấy từ hợp đồng chung `@appchat/shared` — không định nghĩa lại khuôn.
import type { DetectIntentProposal, ExtractField, ExtractInfoProposal, ScoreLeadProposal, SummarizeProposal, UtilityActionId, UtilityEnvelope } from '@appchat/shared';

export type { UtilityActionId, UtilityEnvelope, ExtractField };
export type UtilityProposal = SummarizeProposal | DetectIntentProposal | ExtractInfoProposal | ScoreLeadProposal;

/** Ngữ cảnh do host gắn (Trợ lý: không có hội thoại; Hộp thư: hội thoại + khách đang mở). */
export interface UtilityContext {
  conversationId?: string | null;
  contactId?: string | null;
}

/** Nguồn người dùng chọn tường minh — không bao giờ "toàn bộ CRM". */
export type UtilitySourceChoice =
  | { kind: 'text'; text: string }
  | { kind: 'conversation'; conversation_id: string; message_ids: string[] }
  | { kind: 'contact'; contact_id: string };

export type UtilityPhase = 'idle' | 'running' | 'pending' | 'done' | 'error';
