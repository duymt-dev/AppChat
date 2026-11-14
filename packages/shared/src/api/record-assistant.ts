// Lối vào Trợ lý theo bản ghi (TIP-023g §1): nút ⚡ / ✦ ở dòng Báo giá / Hợp đồng / Đơn / Lịch / Việc follow / Ticket và tab AI của Đề
// nghị thanh toán / Sản phẩm mở Trợ lý gắn ĐÚNG một bản ghi. `record_intent` chỉ là GỢI Ý tham chiếu (loại + UUID + ý định) — server tự
// đọc lại bản ghi theo quyền / scope hiện hành của người gọi; không nhận actor / nguồn / model / danh sách tool / nội dung bản ghi từ client.
import { z } from 'zod';

export const RECORD_ENTITIES = ['quote', 'contract', 'order', 'appointment', 'follow_up', 'ticket', 'invoice', 'product'] as const;
export type RecordEntity = (typeof RECORD_ENTITIES)[number];

export const RECORD_INTENTS = ['inspect', 'review_ticket', 'invoice_task', 'product_combo', 'product_campaign'] as const;
export type RecordIntentKind = (typeof RECORD_INTENTS)[number];

/** Cặp (thực thể, ý định) hợp lệ — server kiểm lại (sai → 422). Một nguồn cho BE + FE + mock. */
export const RECORD_INTENT_PAIRS: Readonly<Record<RecordEntity, readonly RecordIntentKind[]>> = {
  quote: ['inspect'],
  contract: ['inspect'],
  order: ['inspect'],
  appointment: ['inspect'],
  follow_up: ['inspect'],
  ticket: ['inspect', 'review_ticket'],
  invoice: ['inspect', 'invoice_task'],
  product: ['inspect', 'product_combo', 'product_campaign'],
};

/** Ý định sinh đề xuất có cấu trúc (chỉ đọc) — công bố qua binding `record_proposal`, không qua chữ tự do của lượt. */
export const PROPOSAL_INTENTS: readonly RecordIntentKind[] = ['product_combo', 'product_campaign'];

export const USER_TASK_MAX = 2000;

export const recordIntentSchema = z
  .object({
    entity: z.enum(RECORD_ENTITIES),
    entity_id: z.string().uuid(),
    intent: z.enum(RECORD_INTENTS),
    request_id: z.string().uuid(),
    /** Phiên bản bản ghi người dùng đang thấy — chỉ để phát hiện cũ (409), không bao giờ là giá trị hiện hành. */
    displayed_version: z.number().int().min(0).optional(),
    /** Việc người dùng gõ / sửa (gợi ý được trích dẫn, không phải lệnh hệ thống). */
    user_task: z.string().trim().max(USER_TASK_MAX).optional(),
  })
  .strict();
export type RecordIntentInput = z.infer<typeof recordIntentSchema>;

export const isRecordIntentPair = (entity: RecordEntity, intent: RecordIntentKind): boolean => RECORD_INTENT_PAIRS[entity].includes(intent);

export const COMBO_ITEMS_MAX = 10;

/** Đề xuất combo (§3.2): tham chiếu sản phẩm hiện hành + số lượng + lý do; KHÔNG giá / tồn kho do model viết. */
export const comboProposalSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    rationale: z.string().max(1000),
    items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(99) }).strict()).min(1).max(COMBO_ITEMS_MAX),
    unresolved: z.array(z.string().max(200)).max(5),
  })
  .strict();
export type ComboProposal = z.infer<typeof comboProposalSchema>;

/** Đề xuất chiến dịch (§3.3): nội dung + kênh + tiêu chí đối tượng bằng lời — KHÔNG số người nhận / id phân khúc bịa. */
export const campaignProposalSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    goal: z.string().max(500),
    channel: z.enum(['zalo', 'email']),
    content: z.string().min(1).max(2000),
    audience_criteria: z.string().max(500),
  })
  .strict();
export type CampaignProposal = z.infer<typeof campaignProposalSchema>;

export const RECORD_PROPOSAL_STATES = ['pending', 'validated', 'invalidated', 'failed', 'unknown'] as const;

/** Đề xuất đã kiểm theo quyền hiện hành (đọc qua GET) — chưa kiểm xong thì chỉ trạng thái, không chữ thô. */
export const recordProposalDto = z.object({
  id: z.string(),
  request_id: z.string(),
  run_id: z.string(),
  entity: z.enum(RECORD_ENTITIES),
  entity_id: z.string(),
  intent: z.enum(RECORD_INTENTS),
  state: z.enum(RECORD_PROPOSAL_STATES),
  reason: z.string().optional(),
  combo: comboProposalSchema.extend({ items: z.array(z.object({ product_id: z.string(), qty: z.number(), name: z.string(), price: z.string().nullable() })) }).optional(),
  campaign: campaignProposalSchema.optional(),
});
export type RecordProposalDto = z.infer<typeof recordProposalDto>;
