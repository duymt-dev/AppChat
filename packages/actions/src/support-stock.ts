// Đọc tồn ticket so với hôm qua (TIP-034d §4.3) — cùng dịch vụ + cùng kiểu kết quả với thẻ KPI màn Ticket (`/tickets/meta`.stock_summary).
// Chỉ đọc: không chụp quan sát, không gọi model, không trừ Credit. Agent dùng được khi CHỦ ĐỘNG chọn tool ở Builder (không cấp mặc định).
import { z } from 'zod';
import { ticketStockSummarySchema } from '@appchat/shared';
import { defineAction } from './define';

export const ticketStockSummary = defineAction({
  id: 'ticket.stock_summary',
  module: 'support',
  title: 'actions.ticket.stock_summary.title',
  description:
    'Ticket stock today vs yesterday (trend of the ticket KPI cards): read the five ticket stock counts (total, open, waiting, breach = past the resolution deadline, closed) for the tickets the caller can currently see, compared with the real observation taken on the previous calendar day (yesterday, workspace time zone). Use this — not support.performance (closed-ticket SLA / CSAT flow) — for questions comparing ticket counts with yesterday. The comparison only covers tickets that still exist and are visible now, so a change is NOT net workspace growth and does not say why it happened. When there is no observation for yesterday, comparison.status is "unavailable" with a reason — say so, never invent past values. Example: {}',
  input: z.object({}).strict(),
  /** `result_id`: id mờ của tập đóng góp đóng băng (lịch sử chỉ chiếu lại số khi nguồn còn đọc được) — null khi DB chưa có bảng. */
  output: ticketStockSummarySchema.extend({ result_id: z.string().uuid().nullable() }),
  permission: 'ticket.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});
