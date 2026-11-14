// Kiểu chung của pha quyết định bán hàng (TIP-022c §1): nguồn tin cậy của lượt, kết quả phân loại ý định đã kiểm, lý do từ chối an toàn.
import type { CustomerIntent } from '../../kernel/actions/customer-intent';

/** Revision tin nguồn: nội dung tin khách bất biến trong schema hiện tại (không có writer sửa nội dung) — thu hồi / xoá theo dấu thời gian. */
export const SOURCE_REVISION = 1;
/** Tối đa tin khách trong tập nguồn của một lượt (khớp CHECK migration). */
export const MAX_SOURCE_MESSAGES = 10;

export interface SourceMessage {
  id: string;
  /** Nhãn ổn định trong prompt / đoạn trích (`m1`…). */
  ref: string;
  /** Nội dung gốc (digest) — không đưa vào prompt. */
  body: string;
  /** Nội dung đã che PII theo bảng của lượt — đưa vào prompt + so đoạn trích. */
  masked: string;
}

/** Nguồn tin cậy chụp từ lượt agent đang giữ (045b): hội thoại 1-1, khách sống chưa bị quên, tập tin khách nguồn, fence lượt. */
export interface TrustedSource {
  conversationId: string;
  contactId: string;
  /** Gốc chuẩn còn sống của khách (đi theo merged_into) — họ khách tính từ đây. */
  rootContactId: string;
  anchorId: string;
  messages: SourceMessage[];
  digest: string;
  turnFence: number;
  rootRunId: string;
}

export type ClassifiedIntent = CustomerIntent | 'none' | 'ambiguous';

export interface Classification {
  intent: ClassifiedIntent;
  quoteCode: string | null;
  evidence: { message: string; quote: string }[];
  /** Phần trăm [0, 100] — schema nói rõ phần trăm, không tự đổi từ 0–1. */
  confidencePct: number;
}

/** Lý do không có căn cứ (trả cho model dưới dạng lỗi tool → hỏi lại / chuyển người; không hiệu ứng báo giá). */
export type DenyReason =
  | 'no_source' | 'group_source' | 'no_contact' | 'contact_unavailable' | 'privacy' | 'not_auto' | 'attachment_only'
  | 'quote_not_found' | 'quote_not_open' | 'quote_ambiguous' | 'quote_mismatch'
  | 'intent_invalid' | 'intent_unclear' | 'intent_mismatch' | 'low_confidence' | 'classifier_unavailable'
  | 'source_already_decided';

export type Deny = { deny: DenyReason };
export const isDeny = (v: unknown): v is Deny => !!v && typeof v === 'object' && 'deny' in v;
