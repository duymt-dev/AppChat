// DTO cơ hội / Sales Pipeline (TIP-026c §4): thẻ 360°, danh sách theo khách, drawer chi tiết + chuỗi chứng từ, tóm tắt cơ hội mở cho cột
// Khách hàng / chip Hộp thư. Tiền theo field policy 045b: VẮNG `amount_vnd` / `forecast_vnd` + `amount_hidden` khi người xem thiếu
// quote.view (không trả "0" giả); `null` = chưa nhập. Xác suất là hằng theo giai đoạn (không phải số người nhập).
import { z } from 'zod';
import { OPPORTUNITY_LOST_REASONS, OPPORTUNITY_SOURCES, OPPORTUNITY_STAGES } from '../crm/opportunity-stages';

const stage = z.enum(OPPORTUNITY_STAGES);
const person = z.object({ id: z.string(), name: z.string() });
const money = { amount_vnd: z.string().nullable().optional(), forecast_vnd: z.string().nullable().optional(), amount_hidden: z.boolean().optional() };

export const opportunityLineSchema = z.object({ product_id: z.string().nullable(), name: z.string(), qty: z.number().int() });

/** Bước tiếp theo theo luật (không gọi model mỗi GET). `params` = dữ liệu thật để client dịch (`code` báo giá…). */
export const opportunityNextStepSchema = z.object({ key: z.string(), params: z.record(z.string(), z.string()), source: z.literal('rule') });

/** Gợi ý AI đổi giai đoạn còn hiệu lực (event `ai_suggested` chưa áp dụng / bỏ qua) — không có gợi ý thật thì null. */
export const opportunitySuggestionSchema = z.object({ id: z.string(), to_stage: stage, reason_key: z.string(), created_at: z.string() });

export const opportunityItemSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  title: z.string(),
  need: z.string(),
  ...money,
  stage,
  probability: z.number().int(),
  expected_close_date: z.string().nullable(),
  owner: person.nullable(),
  source_kind: z.enum(OPPORTUNITY_SOURCES),
  lost_reason: z.enum(OPPORTUNITY_LOST_REASONS).nullable(),
  items: z.array(opportunityLineSchema),
  closed_at: z.string().nullable(),
  stage_changed_at: z.string(),
  archived: z.boolean(),
  updated_at: z.string(),
  version: z.number().int(),
});

/** Báo giá gắn cơ hội (thẻ 360°): mã + trạng thái + đã xem (chỉ khi người xem thấy báo giá). */
export const opportunityQuoteRefSchema = z.object({ id: z.string(), code: z.string(), status: z.string(), viewed_at: z.string().nullable() });

/** Thẻ 360° — cơ hội hiện hành + báo giá mới nhất + bước tiếp + gợi ý AI. */
export const opportunityCardSchema = opportunityItemSchema.extend({
  quote: opportunityQuoteRefSchema.nullable(),
  next_step: opportunityNextStepSchema.nullable(),
  suggestion: opportunitySuggestionSchema.nullable(),
});

export const opportunityPageSchema = z.object({ items: z.array(opportunityItemSchema), next_cursor: z.string().nullable() });

/** Một bước của chuỗi chứng từ. `hidden` = có chứng từ nhưng người xem không có quyền (không lộ mã). */
export const chainDocSchema = z.object({ id: z.string(), code: z.string(), status: z.string(), amount_vnd: z.string().optional() });
export const chainStepSchema = z.object({ hidden: z.boolean(), docs: z.array(chainDocSchema) });
export const opportunityChainSchema = z.object({
  quote: chainStepSchema,
  contract: chainStepSchema,
  order: chainStepSchema,
  invoice: chainStepSchema,
  /** Đã thu / còn nợ của các đề nghị trong chuỗi (người xem có invoice.manage) — null khi không thấy. */
  paid: z.object({ paid_vnd: z.string(), due_vnd: z.string() }).nullable(),
});

export const opportunityEventSchema = z.object({
  id: z.string(),
  kind: z.string(),
  from_stage: z.string().nullable(),
  to_stage: z.string().nullable(),
  ref: z.object({ type: z.string(), id: z.string() }).nullable(),
  params: z.record(z.string(), z.unknown()),
  actor: z.object({ type: z.string(), name: z.string() }),
  created_at: z.string(),
});

export const opportunityDetailSchema = opportunityCardSchema.extend({
  chain: opportunityChainSchema,
  events: z.array(opportunityEventSchema),
  can_edit: z.boolean(),
});

/** Tóm tắt cơ hội mở theo khách (một truy vấn cho cả trang — cột Khách hàng, chip Hộp thư). */
export const openOpportunitySummarySchema = z.object({ count: z.number().int(), top_stage: stage, amount_vnd: z.string().nullable().optional(), amount_hidden: z.boolean().optional() });

export type OpportunityLineDto = z.infer<typeof opportunityLineSchema>;
export type OpportunityItemDto = z.infer<typeof opportunityItemSchema>;
export type OpportunityCardDto = z.infer<typeof opportunityCardSchema>;
export type OpportunityPageDto = z.infer<typeof opportunityPageSchema>;
export type OpportunityChainDto = z.infer<typeof opportunityChainSchema>;
export type OpportunityEventDto = z.infer<typeof opportunityEventSchema>;
export type OpportunityDetailDto = z.infer<typeof opportunityDetailSchema>;
export type OpportunityNextStepDto = z.infer<typeof opportunityNextStepSchema>;
export type OpenOpportunitySummaryDto = z.infer<typeof openOpportunitySummarySchema>;
