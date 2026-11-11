// Giao thông báo bền (TIP-006b §1.2–1.3, §3): ý định gửi mail (`notification_delivery`) + invalidation realtime (`realtime_delivery`) ghi
// CÙNG transaction với dòng `notification`. Queue chỉ mang (workspace, id ý định, thế hệ claim) — không email / thân / quyền. "accepted" =
// provider nhận, không phải đã tới hộp thư; "published" = Redis nhận, không phải trình duyệt nhận.

export const MAIL_CHANNEL = 'email';
/** Thử lại trước khi provider nhận: tối đa 5 lần, back-off 5 s × 2^n (§3.4). */
export const MAIL_MAX_ATTEMPTS = 5;
export const MAIL_BACKOFF_MS = 5_000;
/** Hạn claim một lần gửi — quá hạn mà còn `dispatching` → `unknown` (có thể provider đã nhận), KHÔNG tự gửi lại. */
export const MAIL_CLAIM_MS = 2 * 60_000;
/** Realtime: thử lại có giới hạn rồi bỏ (client tự làm mới khi nối lại — không cần ACK). */
export const REALTIME_MAX_ATTEMPTS = 8;

export interface MailWakeup {
  ws: string;
  delivery_id: string;
  generation: number;
}

export type MailOutcome = 'accepted' | 'suppressed' | 'retry' | 'unknown' | 'failed' | 'skipped';

/** Lý do chặn an toàn (không nội dung khách / email). */
export type SuppressCode = 'workspace_gone' | 'not_member' | 'no_permission' | 'source_gone' | 'email_off' | 'no_address' | 'owner_changed';
