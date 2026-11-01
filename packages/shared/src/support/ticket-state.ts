// Trạng thái ticket + SLA (REQ-H01–H04, Blueprint §2.2 ticket, state-machine §ticket): bảng chuyển dùng chung BE + mock FE + nút UI.
// Đang mở → Đang xử lý → Đang chờ (đồng hồ người dừng) → Đã đóng (lý do bắt buộc, chốt sla_result) → mở lại (giữ mã, +1 lần mở lại).
// Hạn SLA từ chính sách mặc định: người (FRT / TTR theo giờ làm việc), AI (tuyệt đối). Trạng thái SLA: quá hạn · sắp đến hạn (đã trôi
// ≥ 80% hoặc còn ≤ 60 phút) · trong hạn.
import { defineFlow } from '../state/flow';

export const TICKET_STATUSES = ['open', 'in_progress', 'waiting', 'closed'] as const;
export type TicketStatusKey = (typeof TICKET_STATUSES)[number];
export const TICKET_PRIORITIES = ['high', 'medium', 'low'] as const;
export const TICKET_CLOSE_REASONS = ['resolved', 'duplicate', 'withdrawn', 'out_of_scope'] as const;
export const TICKET_CHANNELS = ['zalo_personal', 'webchat', 'email'] as const;
/** Danh mục gợi ý (prototype TKDATA) — ticket nhận danh mục tự do, danh sách lọc = gợi ý ∪ danh mục đang dùng. */
export const TICKET_CATEGORIES = ['Refund', 'Delivery', 'Policy', 'Billing', 'Technical', 'Return', 'Shipping', 'Complaint'] as const;

/** Khách nhắn lại trong ngần này ngày sau khi đóng → tự mở lại (D52). */
export const TICKET_REOPEN_DAYS = 7;
/** Chống trùng: cùng khách + danh mục còn mở trong 24 giờ → hỏi gộp (REQ-H02). */
export const TICKET_DUP_HOURS = 24;
/** Sắp đến hạn: đã trôi ≥ 80% hạn (quy tắc warn_80) hoặc còn ≤ 60 phút. */
export const SLA_WARN_RATIO = 0.8;
export const SLA_RISK_MIN = 60;

export const TICKET_FLOW = defineFlow<TicketStatusKey>({
  open: { 'ticket.set_status:in_progress': 'in_progress', 'ticket.set_status:waiting': 'waiting', 'ticket.close': 'closed' },
  in_progress: { 'ticket.set_status:open': 'open', 'ticket.set_status:waiting': 'waiting', 'ticket.close': 'closed' },
  waiting: { 'ticket.set_status:in_progress': 'in_progress', 'ticket.set_status:open': 'open', 'ticket.customer_reply': 'in_progress', 'ticket.close': 'closed' },
  closed: { 'ticket.reopen': 'open' },
  terminal: [],
});

/** Khoá chuyển của ticket.set_status (đích nằm trong khoá). */
export const setStatusKey = (to: string) => `ticket.set_status:${to}`;

export type SlaState = 'breach' | 'risk' | 'ok';

/** Trạng thái SLA từ hạn TTR: `start` = lúc hạn bắt đầu chạy, `due` = hạn (đã cộng thời gian dừng), `pausedAt` = đang dừng từ. */
export function slaStateOf(o: { status: TicketStatusKey; slaResult: string | null; start: Date; due: Date; pausedAt: Date | null; now: Date }): { state: SlaState; left_min: number | null } {
  if (o.status === 'closed') return { state: o.slaResult === 'breached' ? 'breach' : 'ok', left_min: null };
  const at = o.pausedAt ?? o.now;
  const left = Math.round((o.due.getTime() - at.getTime()) / 60_000);
  const total = Math.max(1, (o.due.getTime() - o.start.getTime()) / 60_000);
  const used = 1 - left / total;
  return { state: left < 0 ? 'breach' : left <= SLA_RISK_MIN || used >= SLA_WARN_RATIO ? 'risk' : 'ok', left_min: left };
}
