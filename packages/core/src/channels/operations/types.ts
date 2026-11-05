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
/** Job lần lấy lịch sử (TIP-014b C) — chung hàng đợi thao tác `chop-<tài khoản>`. */
export interface HistoryJob {
  ws: string;
  history_run_id: string;
}

/** Lệnh bạn bè (TIP-014b E) — một lệnh mở mỗi người; job id theo (người, mốc yêu cầu). */
export interface FriendJob {
  ws: string;
  external_id: string;
}

/** Tra một SĐT (TIP-014b E). */
export interface LookupJob {
  ws: string;
  lookup_id: string;
}

/** Job đồng bộ danh bạ (TIP-014b D3) — chung hàng đợi thao tác `chop-<tài khoản>`, job id = id lần đồng bộ. */
export interface ContactSyncJob {
  ws: string;
  sync_id: string;
}

/** Job đồng bộ ảnh đại diện (TIP-014b D) — chung hàng đợi thao tác `chop-<tài khoản>`; một job chờ / tài khoản. */
export interface AvatarJob {
  ws: string;
}

/**
 * Pipeline tin vào cho lịch sử — Inbox đăng ký (channels không import inbox). `run` ném lỗi tên `DuplicateInbound` khi tin đã có.
 */
export interface HistoryPipeline {
  run(tx: unknown, ws: string, m: unknown, now: Date, origin: 'history'): Promise<{ messageId: string | null; conversationId?: string }>;
}

export const OPERATION_TIMEOUT_MS = 30_000;
