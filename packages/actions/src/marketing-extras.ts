// Marketing mở rộng (TIP-037, Blueprint §3.4 marketing): phân khúc CRUD, AI phân tích / soạn nội dung, nhập / xuất người nhận, tạo nháp
// gửi lại, huỷ nhận tin qua token, và các action HỆ THỐNG của luồng gửi (campaign.dispatch / record_delivery / record_metric /
// store_analysis — SYSTEM_ONLY, input chỉ là id đã kiểm; người / Trợ lý / agent không gọi được).
import { z } from 'zod';
import { segmentFilterSchema } from '@appchat/shared';
import { defineAction } from './define';

const segmentId = z.string().uuid();
const campaignId = z.string().min(1);
const ifVersion = z.number().int().min(1).optional();

export const segmentCreate = defineAction({
  id: 'segment.create',
  module: 'marketing',
  title: 'actions.segment.create.title',
  description: 'Save a dynamic customer segment as a closed filter (tags, stage, source, group, tier, total_spent VND string, last order / interaction, order count, purchased products). Example: {"name":"VIP lâu không mua","filter":{"op":"and","children":[{"field":"group","op":"in","value":["vip"]},{"field":"last_order_at","op":"older_than_days","value":90}]}}',
  input: z.object({ name: z.string().trim().min(1).max(120), filter: segmentFilterSchema }),
  output: z.object({ segment_id: z.string(), count: z.number().int(), version: z.number().int() }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
});

export const segmentUpdate = defineAction({
  id: 'segment.update',
  module: 'marketing',
  title: 'actions.segment.update.title',
  description: 'Rename or change the filter of a saved segment (optimistic version check). Example: {"segment_id":"0190f000-0000-7000-8000-000000000001","name":"VIP","if_version":1}',
  input: z.object({ segment_id: segmentId, name: z.string().trim().min(1).max(120).optional(), filter: segmentFilterSchema.optional(), if_version: ifVersion }),
  output: z.object({ segment_id: z.string(), count: z.number().int(), version: z.number().int() }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
});

export const segmentDelete = defineAction({
  id: 'segment.delete',
  module: 'marketing',
  title: 'actions.segment.delete.title',
  description: 'Delete a saved segment that no draft / pending campaign still uses. Example: {"segment_id":"0190f000-0000-7000-8000-000000000001","if_version":2}',
  input: z.object({ segment_id: segmentId, if_version: ifVersion }),
  output: z.object({ segment_id: z.string() }),
  permission: 'campaign.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
});

export const campaignAnalyze = defineAction({
  id: 'campaign.analyze',
  module: 'marketing',
  title: 'actions.campaign.analyze.title',
  description: 'Start an AI analysis of customer data (scoped to your CRM access) that refreshes the 4 campaign suggestions (reactivation, upsell, conversion, aftercare). Runs in the background and uses AI Credit. Example: {}',
  input: z.object({}),
  output: z.object({ run_id: z.string(), status: z.string() }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignDraftContent = defineAction({
  id: 'campaign.draft_content',
  module: 'marketing',
  title: 'actions.campaign.draft_content.title',
  description: 'Rewrite campaign text in a tone (friendly, formal, short, promo) keeping allowed variables {ten}, {ma_khach}, {hang}. Returns a proposal only; nothing is saved. Uses AI Credit. Example: {"text":"Chào {ten}, spa có ưu đãi 20% tuần này","tone":"friendly","channel":"zalo"}',
  input: z.object({ text: z.string().trim().min(1).max(4000), tone: z.enum(['friendly', 'formal', 'short', 'promo']), channel: z.enum(['zalo', 'email']) }),
  output: z.object({ text: z.string(), run_id: z.string() }),
  permission: 'campaign.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const campaignAudienceImport = defineAction({
  id: 'campaign.audience_import',
  module: 'marketing',
  title: 'actions.campaign.audience_import.title',
  description: 'Import an uploaded Excel/CSV list (columns name, phone, email) as campaign recipients: matches existing customers you can see, creates new ones (needs crm.import), never takes over an owned customer or re-subscribes an opted-out one. dry_run returns counts only. Example: {"file_id":"0190f000-0000-7000-8000-0000000000f1","dry_run":true}',
  // file_id như product.import (min 1) — server kiểm uuid + quyền tệp ở checkFile; campaign_id cùng kiểu campaignId của các action khác.
  input: z.object({ file_id: z.string().min(1), campaign_id: campaignId.optional(), dry_run: z.boolean().optional() }),
  output: z.object({
    batch_id: z.string().nullable(),
    rows: z.number().int(),
    valid: z.number().int(),
    invalid: z.number().int(),
    duplicate: z.number().int(),
    opted_out: z.number().int(),
    created: z.number().int(),
    errors: z.array(z.object({ row: z.number().int(), reason: z.string() })),
  }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing', 'crm'],
});

export const campaignRecipientExport = defineAction({
  id: 'campaign.recipient_export',
  module: 'marketing',
  title: 'actions.campaign.recipient_export.title',
  description: 'Export the recipients of a campaign (current status filter) to CSV — only customers you can see; download link is authenticated and expires. Example: {"campaign_id":"0190f000-0000-7000-8000-000000000101","status":"sent"}',
  input: z.object({ campaign_id: campaignId, status: z.string().max(20).optional() }),
  output: z.object({ file_id: z.string(), rows: z.number().int(), url: z.string() }),
  permission: 'campaign.view',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const campaignResendUnread = defineAction({
  id: 'campaign.resend_unread',
  module: 'marketing',
  title: 'actions.campaign.resend_unread.title',
  description: 'Create a NEW draft campaign for recipients that were sent but have no read / reply evidence (still subject to opt-out, 48h cool-down and approval). Nothing is sent. Example: {"campaign_id":"0190f000-0000-7000-8000-000000000101"}',
  input: z.object({ campaign_id: campaignId }),
  output: z.object({ campaign_id: z.string(), code: z.string(), est_recipients: z.number().int(), read_evidence: z.boolean() }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
});

export const campaignUnsubscribe = defineAction({
  id: 'campaign.unsubscribe',
  module: 'marketing',
  title: 'actions.campaign.unsubscribe.title',
  description: 'Public: a recipient opts out of marketing messages through the signed link in a campaign message. Only sets marketing_opt_out for that customer. Example: {"token":"0190f000-0000-7000-8000-000000000201.abcdefghijklmnopqrstuvwxyz012345"}',
  input: z.object({ token: z.string().min(20).max(400) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing', 'crm'],
});

// ── Hệ thống (SYSTEM_ONLY) ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const campaignDispatch = defineAction({
  id: 'campaign.dispatch',
  module: 'marketing',
  title: 'actions.campaign.dispatch.title',
  description: 'System-only: claim the next batch of pending recipients of an approved running campaign and hand them to the channel send queue after re-checking opt-out, endpoint, 48h cool-down and approval snapshot. Example: {"campaign_id":"0190f000-0000-7000-8000-000000000101","approved_version":3,"batch":0}',
  input: z.object({ campaign_id: z.string().uuid(), approved_version: z.number().int(), batch: z.number().int().min(0) }),
  output: z.object({ claimed: z.number().int(), skipped: z.number().int(), done: z.boolean() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignRecordDelivery = defineAction({
  id: 'campaign.record_delivery',
  module: 'marketing',
  title: 'actions.campaign.record_delivery.title',
  description: 'System-only: record the channel send result of one campaign recipient by its delivery reference. Example: {"delivery_ref":"cr_0190f000-0000-7000-8000-000000000301","outcome":"accepted","definite":true}',
  input: z.object({ delivery_ref: z.string().max(80), outcome: z.enum(['accepted', 'unknown', 'failed']), definite: z.boolean(), external_msg_id: z.string().max(200).optional(), error: z.string().max(200).optional() }),
  output: z.object({ recipient_id: z.string().nullable(), status: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignRecordMetric = defineAction({
  id: 'campaign.record_metric',
  module: 'marketing',
  title: 'actions.campaign.record_metric.title',
  description: 'System-only: attribute a customer reply (message event) or an order (order event) to the last campaign sent to that customer in the attribution window. Example: {"event_id":"0190f000-0000-7000-8000-0000000000e1","kind":"reply"}',
  input: z.object({ event_id: z.string().uuid(), kind: z.enum(['reply', 'conversion']) }),
  output: z.object({ recipient_id: z.string().nullable() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignStoreAnalysis = defineAction({
  id: 'campaign.store_analysis',
  module: 'marketing',
  title: 'actions.campaign.store_analysis.title',
  description: 'System-only: validate and store the structured suggestions produced by a finished campaign.analyze AI run. Example: {"run_id":"0190f000-0000-7000-8000-0000000000a1"}',
  input: z.object({ run_id: z.string().uuid() }),
  output: z.object({ stored: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});
