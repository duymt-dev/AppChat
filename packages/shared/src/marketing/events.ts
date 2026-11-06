// Event domain marketing (TIP-037, Blueprint §2.3): vòng đời chiến dịch (thông báo người duyệt, làm mới FE), lô gửi tới hạn (scheduler
// ROLE=jobs → hàng gửi của tài khoản ở ROLE=channels), kết quả gửi từng người nhận. Payload chỉ id — không nội dung / PII.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };
const campaign = { campaign_id: z.string().uuid(), code: z.string(), status: z.string(), version: z.number().int(), actor_user_id: z.string().uuid().nullable() };

export const campaignChangedEvent = z.object({ ...base, ...campaign });
export const campaignDeliveryEvent = z.object({ ...base, campaign_id: z.string().uuid(), recipient_id: z.string().uuid(), outcome: z.enum(['accepted', 'unknown', 'failed']) });
export const segmentChangedEvent = z.object({ ...base, segment_id: z.string().uuid(), change: z.enum(['created', 'updated', 'deleted']) });
export const suggestionsUpdatedEvent = z.object({ ...base, run_id: z.string().uuid(), count: z.number().int().min(0) });
export const campaignAnalyzeEvent = z.object({ ...base, run_id: z.string().uuid(), requested_by: z.string().uuid() });

export const MARKETING_EVENT_SCHEMAS = {
  'campaign.submitted': campaignChangedEvent,
  'campaign.approved': campaignChangedEvent,
  'campaign.rejected': campaignChangedEvent,
  'campaign.paused': campaignChangedEvent,
  'campaign.resumed': campaignChangedEvent,
  'campaign.cancelled': campaignChangedEvent,
  'campaign.completed': campaignChangedEvent,
  'campaign.updated': campaignChangedEvent,
  'campaign.delivery_recorded': campaignDeliveryEvent,
  'campaign.analysis_requested': campaignAnalyzeEvent,
  'segment.changed': segmentChangedEvent,
  'campaign.suggestions_updated': suggestionsUpdatedEvent,
} as const;
