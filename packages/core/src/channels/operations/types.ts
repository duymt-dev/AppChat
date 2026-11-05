// Kiểu nội bộ thao tác kênh (TIP-014b A). Trạng thái lệnh: queued → dispatch_reserved → confirmed | failed | unknown; queued → cancelled |
// superseded. Chỉ `confirmed` (ACK nhà cung cấp) đổi tin; `unknown` hiện trung thực, không tự thử lại.
import type { ReactionEmoji } from '@appchat/channels';

export type OperationKind = 'recall' | 'react';
export type OperationStatus = 'queued' | 'dispatch_reserved' | 'confirmed' | 'failed' | 'unknown' | 'partial' | 'cancelled' | 'superseded';

export const OPEN_STATUSES: readonly OperationStatus[] = ['queued', 'dispatch_reserved'];

/** Lệnh `react`: cảm xúc cuối mong muốn của tài khoản (null = gỡ). */
export interface ReactDesired {
  emoji: ReactionEmoji | null;
}

export interface OperationJob {
  ws: string;
  operation_id: string;
}

/** Self-event tới trước biên nhận gửi: giữ tối đa 10 phút để ghép. */
export const PENDING_REF_TTL_MS = 10 * 60_000;
/** Treo quá mốc này sau khi đã gọi kênh → unknown (nhà cung cấp có thể đã làm). */
export const OPERATION_TIMEOUT_MS = 30_000;
