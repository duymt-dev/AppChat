// Shape đọc Marketing (Blueprint §4.4 marketing, TIP-037): /v1/segments, /campaigns?page&limit&status&channel&q, /campaigns/meta,
// /campaigns/:id (+ trang đầu người nhận), /campaigns/:id/recipients, /campaign-suggestions. Số đo chỉ từ bằng chứng (DC-240): kênh không
// có xác nhận đọc / click → null (không phải 0 đo được). Tiền là chuỗi VND.
import { z } from 'zod';
import { CAMPAIGN_CHANNELS, CAMPAIGN_KINDS, CAMPAIGN_STATUSES, DELIVERY_OUTCOMES, RECIPIENT_STATUSES, SKIP_REASONS } from '../marketing/state';
import { segmentNodeSchema } from '../marketing/segment-filter';
import { campaignSenderSchema } from './tenant-mail';

export const segmentDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  filter: segmentNodeSchema,
  is_dynamic: z.boolean(),
  last_count: z.number().int(),
  version: z.number().int(),
  updated_at: z.string(),
});
export type SegmentDto = z.infer<typeof segmentDtoSchema>;

export const campaignStatsSchema = z.object({
  /** Người nhận hợp lệ trong snapshot đã duyệt (mẫu số). */
  eligible: z.number().int(),
  sent: z.number().int(),
  skipped: z.number().int(),
  failed: z.number().int(),
  /** Đã gọi kênh mà chưa rõ tới khách — cần người kiểm tra, không tự gửi lại. */
  unknown: z.number().int(),
  replied: z.number().int(),
  converted: z.number().int(),
  /** Kênh không hỗ trợ xác nhận đọc / click → null. */
  open: z.number().int().nullable(),
  click: z.number().int().nullable(),
  /** % người nhận đã kết thúc (sent / skipped / failed / unknown) trên tổng snapshot. */
  progress: z.number().int(),
  revenue: z.string(),
});
export type CampaignStats = z.infer<typeof campaignStatsSchema>;

export const campaignDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  desc: z.string(),
  channel: z.enum(CAMPAIGN_CHANNELS),
  kind: z.enum(CAMPAIGN_KINDS),
  source: z.enum(['ai', 'manual']),
  status: z.enum(CAMPAIGN_STATUSES),
  version: z.number().int(),
  account_id: z.string().nullable(),
  account_name: z.string(),
  /** TIP-012c: người gửi đã chốt (kênh hoặc mail của DN + trạng thái dùng được hiện tại). Vắng ở dữ liệu cũ = channel_account. */
  sender: campaignSenderSchema.optional(),
  segment: z.string(),
  segment_ids: z.array(z.string()),
  est_recipients: z.number().int(),
  /** Dự toán AI Credit (DC-246) — không có lời gọi AI thì 0; không phải giá gửi tin. */
  est_credits: z.number().int(),
  date: z.string(),
  end: z.string(),
  scheduled_at: z.string().nullable(),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  stats: campaignStatsSchema,
  capabilities: z.object({ read_receipt: z.boolean(), click: z.boolean() }),
  content: z.object({ text: z.string(), subject: z.string().optional(), cta: z.string().optional() }),
  ab: z.object({ text_b: z.string() }).nullable(),
  send: z.enum(['now', 'schedule', 'ai_time']),
  /** [loại, người, giờ] — lịch sử append-only. */
  history: z.array(z.tuple([z.string(), z.string(), z.string()])),
  reject_reason: z.string().optional(),
  allowed: z.array(z.string()),
});
export type CampaignDto = z.infer<typeof campaignDtoSchema>;

export const recipientDtoSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  conversation_id: z.string().nullable(),
  name: z.string(),
  endpoint: z.string(),
  status: z.enum(RECIPIENT_STATUSES),
  skip_reason: z.enum(SKIP_REASONS).nullable(),
  outcome: z.enum(DELIVERY_OUTCOMES).nullable(),
  variant: z.enum(['a', 'b']),
  sent_at: z.string().nullable(),
  replied_at: z.string().nullable(),
  /** null = kênh không có xác nhận đọc (không khẳng định "chưa đọc"). */
  read_at: z.string().nullable(),
});
export type RecipientDto = z.infer<typeof recipientDtoSchema>;

export const campaignDetailSchema = campaignDtoSchema.extend({
  recipients: z.array(recipientDtoSchema),
  recipients_total: z.number().int(),
});
export type CampaignDetailDto = z.infer<typeof campaignDetailSchema>;

export const marketingCustomerSchema = z.object({ id: z.string(), name: z.string(), phone: z.string(), email: z.string(), group: z.string(), label: z.string() });
export type MarketingCustomer = z.infer<typeof marketingCustomerSchema>;

export const senderAccountSchema = z.object({ id: z.string(), type: z.string(), name: z.string(), status: z.string(), daily_cap: z.number().int().nullable() });
export type SenderAccount = z.infer<typeof senderAccountSchema>;

export const campaignSuggestionSchema = z.object({
  id: z.string(),
  kind: z.enum(['reactivation', 'upsell', 'conversion', 'aftercare']),
  status: z.enum(['new', 'used', 'dismissed']),
  title: z.string(),
  reason: z.string(),
  est_count: z.number().int(),
  best_time: z.string().nullable(),
  channel: z.enum(CAMPAIGN_CHANNELS),
  filter: segmentNodeSchema,
  subject: z.string(),
  body: z.string(),
  cta: z.string(),
  run_id: z.string().nullable(),
  generated_at: z.string(),
});
export type CampaignSuggestionDto = z.infer<typeof campaignSuggestionSchema>;

/** Lượt AI phân tích (campaign.analyze → worker ROLE=ai): `queued` = chưa có run; `completed` khi gợi ý đã lưu (`stored` = số gợi ý). */
export const campaignAnalysisSchema = z.object({
  run_id: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  stored: z.number().int().nullable(),
  error: z.string().nullable(),
});
export type CampaignAnalysisDto = z.infer<typeof campaignAnalysisSchema>;
