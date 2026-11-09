// Trạng thái lượt "Quên khách" (TIP-015c §1.4): accepted → fencing → inventory → erasing → needs_review | verifying → completed_with_exceptions.
// retryable_failed tạm (khôi phục chạy lại, không mất fence). Không có "completed" tuyệt đối — luôn completed_with_exceptions (giữ phần
// còn lưu DC-259/264/265). needs_review chỉ tiến khi mọi mục đã có disposition đã kiểm (ai/privacy/review-content quyết, không phải flow).
import { defineFlow } from '../state/flow';

export const PRIVACY_OPERATION_PHASES = [
  'accepted',
  'fencing',
  'inventory',
  'erasing',
  'needs_review',
  'verifying',
  'completed_with_exceptions',
  'retryable_failed',
] as const;
export type PrivacyOperationPhase = (typeof PRIVACY_OPERATION_PHASES)[number];

/** Chuyển pha chỉ do job khôi phục / verifier gọi (không có action người dùng nào đổi trực tiếp) — khoá tên bước nội bộ. */
export const PRIVACY_FLOW = defineFlow<PrivacyOperationPhase>({
  accepted: { 'privacy.step:fencing': 'fencing' },
  fencing: { 'privacy.step:inventory': 'inventory', 'privacy.step:retry': 'retryable_failed' },
  inventory: { 'privacy.step:erasing': 'erasing', 'privacy.step:needs_review': 'needs_review', 'privacy.step:retry': 'retryable_failed' },
  erasing: { 'privacy.step:needs_review': 'needs_review', 'privacy.step:verifying': 'verifying', 'privacy.step:retry': 'retryable_failed' },
  needs_review: { 'privacy.step:erasing': 'erasing', 'privacy.step:verifying': 'verifying' },
  verifying: { 'privacy.step:completed': 'completed_with_exceptions', 'privacy.step:needs_review': 'needs_review', 'privacy.step:retry': 'retryable_failed' },
  retryable_failed: { 'privacy.step:fencing': 'fencing', 'privacy.step:inventory': 'inventory', 'privacy.step:erasing': 'erasing', 'privacy.step:verifying': 'verifying' },
  // Hoàn tất mới phát hiện artifact mới → mở lại (TIP-015c §2.7) — không có chuyển "ra" khỏi completed trong bảng vì flow một chiều;
  // reopen là một pha MỚI do verifier ghi trực tiếp (không qua assertTransition) khi needs_review/erasing tại revision kế tiếp.
  completed_with_exceptions: {},
  terminal: ['completed_with_exceptions'],
});

/** Đĩa dispositions cho review item (TIP-015c §2.5, §5.7). */
export const PRIVACY_ITEM_DISPOSITIONS = ['proven_unrelated', 'erase_exclusive', 'redact_shared', 'retained_issued'] as const;
export type PrivacyItemDisposition = (typeof PRIVACY_ITEM_DISPOSITIONS)[number];

export const PRIVACY_ARTIFACT_STATES = ['allowed', 'quarantined', 'erase_pending', 'erased', 'retained_issued'] as const;
export type PrivacyArtifactState = (typeof PRIVACY_ARTIFACT_STATES)[number];

/** `completed_with_exceptions` là trạng thái cuối DUY NHẤT hiển thị "hoàn tất" — không có "completed" tuyệt đối (DC-259/264/265). */
export const isTerminalPrivacyPhase = (p: PrivacyOperationPhase): boolean => PRIVACY_FLOW.terminal.includes(p);
