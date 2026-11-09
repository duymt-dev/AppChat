// Sự kiện outbox "Quên khách" (TIP-015c §1.7): chỉ ID + thế hệ + pha — không có nội dung / PII mới trong payload sự kiện.
import type { PrivacyOperationPhase } from './state';

export const PRIVACY_REQUESTED = 'contact.privacy_requested';
export const PRIVACY_PROGRESSED = 'contact.privacy_progressed';
export const PRIVACY_FORGOTTEN = 'contact.forgotten';

export interface PrivacyRequestedPayload {
  operation_id: string;
  canonical_contact_id: string;
  family_generation: number;
  requester_id: string;
}

export interface PrivacyProgressedPayload {
  operation_id: string;
  phase: PrivacyOperationPhase;
}

/** Phát SAU khi verifier xác nhận không còn mục chặn (DC-264/265) — không phải lúc accept. */
export interface PrivacyForgottenPayload {
  operation_id: string;
  canonical_contact_id: string;
  family_generation: number;
}
