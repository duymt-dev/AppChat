// Shape đọc Ticket (FE ↔ BE — gap-filling §5, TIP-034): GET /v1/tickets?status=&priority=&team=&category=&assignee=&sla=&q=&sort=&cf.*
// &page=&limit= (D42 — `{ data, next_cursor, meta }`), /tickets/meta (nhóm, danh mục, agent, thành viên, KPI 5 ô, gợi ý AI theo luật),
// /tickets/:id (kèm bình luận + lịch sử). Mock transport (apps/web) và API thật parse cùng schema.
import { z } from 'zod';
import { customValuesSchema } from '../custom-fields/values';
import { TICKET_CHANNELS, TICKET_PRIORITIES, TICKET_STATUSES } from '../support/ticket-state';

export const ticketCommentSchema = z.object({
  id: z.string(),
  /** contact | user | agent | system */
  author_type: z.string(),
  author: z.string(),
  body: z.string(),
  internal: z.boolean(),
  at: z.string(),
});

export const ticketEventSchema = z.object({
  /** created | assigned | status | note | reply | closed | reopened | priority | escalated */
  type: z.string(),
  by: z.string(),
  at: z.string(),
  status: z.string().optional(),
  reason: z.string().optional(),
});

export const ticketRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  channel: z.enum(TICKET_CHANNELS),
  company: z.string(),
  email: z.string(),
  contact_id: z.string().nullable(),
  status: z.enum(TICKET_STATUSES),
  priority: z.enum(TICKET_PRIORITIES),
  assignee_user_id: z.string().nullable(),
  assignee_agent_id: z.string().nullable(),
  assignee_name: z.string(),
  team_id: z.string(),
  team_name: z.string(),
  sla_policy_name: z.string(),
  frt_target_min: z.number().int(),
  ttr_target_min: z.number().int(),
  /** Phút tới phản hồi đầu (đã phản hồi) hoặc đã trôi (chưa phản hồi). */
  frt_min: z.number().int(),
  ttr_due_at: z.string(),
  paused_since: z.string().nullable(),
  sla_result: z.enum(['met', 'breached']).nullable(),
  close_reason: z.string().nullable(),
  escalations: z.number().int(),
  reopened_count: z.number().int(),
  csat: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  comments: z.array(ticketCommentSchema),
  events: z.array(ticketEventSchema),
  sla: z.object({ state: z.enum(['breach', 'risk', 'ok']), left_min: z.number().int().nullable() }),
  custom: customValuesSchema.optional(),
  /** TIP-034c: version hiện tại (trigger DB tăng mỗi UPDATE) — chọn nhiều gửi kèm `if_versions`; client cũ bỏ qua. */
  version: z.number().int().optional(),
});

export const ticketsPageSchema = z.object({
  data: z.array(ticketRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

const kpi = z.object({ total: z.number().int(), open: z.number().int(), waiting: z.number().int(), breach: z.number().int(), closed: z.number().int() });

export const ticketsMetaSchema = z.object({
  now: z.string(),
  teams: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Gợi ý danh mục = bộ cấu hình (TIP-034b) ∪ trang đầu nhãn đã dùng trong ticket người xem thấy (khử trùng, cấu hình trước). */
  categories: z.array(z.string()),
  /** TIP-034b: bộ cấu hình riêng (version + mặc định) — client cũ bỏ qua. */
  category_config: z.object({ version: z.number().int(), labels: z.array(z.string()), default: z.string() }).optional(),
  /** Còn nhãn đã dùng ngoài trang đầu (đọc tiếp qua /support/category-suggestions). */
  used_has_more: z.boolean().optional(),
  agent: z.object({ id: z.string(), name: z.string() }),
  members: z.array(z.object({ id: z.string(), name: z.string(), role: z.string() })),
  trend: z.record(z.enum(['total', 'open', 'waiting', 'breach', 'closed']), z.string()),
  ai: z.array(z.tuple([z.string(), z.string(), z.string()])),
  counts: kpi,
});

export type TicketRow = z.infer<typeof ticketRowSchema>;
export type TicketsMetaDto = z.infer<typeof ticketsMetaSchema>;
