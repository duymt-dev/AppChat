// Việc hệ thống của ticket (Blueprint §2.3 consumer `support`, REQ-H03, D52): facade mỏng — TIP-003c chuyển thân transaction sang action
// riêng `ticket.system_transition` (support/system/*):
// - Quét SLA: còn ≤ 20% hạn TTR → `ticket.sla_warning`; quá hạn FRT / TTR → `ticket.sla_breached` — mỗi mốc một lần theo quy tắc leo thang
//   của chính sách; agent quá hạn TTR → giao người.
// - `message.received` của hội thoại có ticket: chép tin khách vào bình luận, đang chờ → Đang xử lý, đóng trong 7 ngày → tự mở lại, CSAT.
// - `message.sent` (người / agent) → chốt phản hồi đầu theo giờ tin (mỗi ticket một biên nhận).
import type { TenantDb } from '@appchat/db';
import type { SystemRunDeps } from '../../kernel/actions/system';
import { customerMessageToTicket, firstResponseToTickets, sweepSlaDue } from '../system/dispatch';

/** Quét SLA một workspace. Trả số mốc đã phát. */
export const sweepSla = (db: TenantDb, ws: string, now: Date, d: SystemRunDeps) => sweepSlaDue(db, ws, now, d);

/** Tin khách vào hội thoại có ticket. */
export const onCustomerMessage = (db: TenantDb, ws: string, p: { conversation_id: string; message_id: string }, d: SystemRunDeps) =>
  customerMessageToTicket(db, ws, p.conversation_id, p.message_id, d);

/** Người / agent trả lời trong hội thoại có ticket chưa phản hồi → chốt phản hồi đầu. Tin hệ thống không tính. */
export async function onAgentReply(db: TenantDb, ws: string, p: { conversation_id: string; message_id: string; sender_type: string }, d: SystemRunDeps): Promise<number> {
  if (p.sender_type === 'system') return 0;
  return firstResponseToTickets(db, ws, p.conversation_id, p.message_id, d);
}
