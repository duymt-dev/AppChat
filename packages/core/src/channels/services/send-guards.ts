// Chốt chặn trước khi gọi kênh theo domain (TIP-037, omnichannel-adapter §6): domain sở hữu bản ghi gửi đăng ký theo tiền tố `ref_id`
// (vd. `cr_` = người nhận chiến dịch) — worker gửi hỏi đúng domain đó, KHÔNG import domain (channels không phụ thuộc marketing). `reserve`
// kiểm lại ngay trước provider (huỷ nhận tin / chiến dịch tạm dừng / huỷ / bản duyệt) và ghi đặt chỗ bền; `book` cấp sổ từng phần để chạy
// lại không gửi mù lần hai; `result` nhận kết quả gửi của ref đó (không phát cho sink Inbox — id không phải outbox). Ref không khớp tiền tố
// nào → đường cũ (Inbox: reserver + sổ + sink toàn cục).
import type { SendLedger } from '@appchat/channels';

/** Bản rút gọn của SendJob / SendResult / SendBook (send-queue phụ thuộc file này — không import ngược). */
type GuardJob = { ws: string; account_id: string; ref_id: string };
type GuardResult = { ok: boolean; ws: string; ref_id: string; external_msg_id?: string; error?: string; final?: boolean; outcome?: 'partial' | 'unknown' };
type GuardBook = { ledger: SendLedger; fail(definite: boolean, error: string): Promise<number> };

export interface SendGuard {
  /** false = bị loại (đã ghi lý do phía domain) → không gọi kênh, không thử lại. Lỗi ném ra → BullMQ thử lại (chưa gọi kênh). */
  reserve(ws: string, refId: string): Promise<boolean>;
  book?(ws: string, accountId: string, job: GuardJob, generation?: number): Promise<GuardBook | null>;
  result(r: GuardResult): Promise<void>;
}

const GUARDS = new Map<string, SendGuard>();

export const registerSendGuard = (prefix: string, g: SendGuard) => void GUARDS.set(prefix, g);
export const unregisterSendGuard = (prefix: string) => void GUARDS.delete(prefix);

export function guardFor(refId: string): SendGuard | null {
  for (const [p, g] of GUARDS) if (refId.startsWith(p)) return g;
  return null;
}
