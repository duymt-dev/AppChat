// Marketing (Blueprint §3.4 marketing; §2.2 segment / campaign / campaign_suggestion). Prototype L3394–3870.
// Kênh chỉ Zalo cá nhân + Email. draft → pending_approval → approved/scheduled → running → completed; rejected / paused / cancelled.
// campaign.approve là lệnh gửi hàng loạt — luôn xác nhận (risk send).
import { z } from 'zod';
import { segmentFilterSchema } from '@appchat/shared';
import { defineAction } from './define';

const campaignId = z.string().min(1);
const channel = z.enum(['zalo', 'email']);
const out = z.object({ campaign_id: z.string(), status: z.string(), version: z.number().int().optional() });
/** Khoá lạc quan (concurrency §1): FE luôn gửi; lệch → STALE_VERSION 409. */
const ifVersion = z.number().int().min(1).optional();
const content = z.object({
  subject: z.string().max(200).optional(),
  text: z.string().trim().min(1).max(4000),
  cta: z.string().max(120).optional(),
});
const opened = (o: { campaign_id: string }) => ({
  type: 'open' as const,
  entity: 'campaign',
  id: o.campaign_id,
  view: 'drawer' as const,
});

export const segmentPreview = defineAction({
  id: 'segment.preview',
  module: 'marketing',
  title: 'actions.segment.preview.title',
  description: 'Count contacts matching saved segments and/or an ad-hoc filter (closed AST) before creating a campaign; reachable excludes opted-out, no endpoint on the channel and contacts reached by another campaign in the last 48h. Example: {"segment_ids":["0190f000-0000-7000-8000-000000000001"],"channel":"zalo"}',
  input: z
    .object({ segment_ids: z.array(z.string().uuid()).max(10).optional(), filter: segmentFilterSchema.optional(), contact_ids: z.array(z.string().uuid()).max(5000).optional(), channel: channel.optional() })
    .refine((v) => (v.segment_ids?.length ?? 0) + (v.filter ? 1 : 0) + (v.contact_ids?.length ?? 0) > 0, { message: 'audience', path: ['segment_ids'] }),
  output: z.object({ count: z.number(), reachable: z.number() }),
  permission: 'campaign.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const campaignSuggest = defineAction({
  id: 'campaign.suggest',
  module: 'marketing',
  title: 'actions.campaign.suggest.title',
  description: 'List AI campaign suggestions (reactivation, upsell, conversion, aftercare) with estimated audience and best time.',
  input: z.object({}),
  output: z.object({ suggestions: z.array(z.object({ id: z.string(), title: z.string(), est_count: z.number() })) }),
  permission: 'campaign.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const campaignCreate = defineAction({
  id: 'campaign.create',
  module: 'marketing',
  title: 'actions.campaign.create.title',
  description:
    'Create a draft campaign for a segment on Zalo personal or Email. Example: {"name":"Win-back 60 ngày","channel":"zalo","segment_ids":["0190f000-0000-7000-8000-000000000001"],"content":{"text":"Chào {ten}…"}}',
  input: z.object({
    name: z.string().trim().min(1).max(160),
    kind: z.enum(['reactivation', 'upsell', 'conversion', 'aftercare', 'manual']).optional(),
    channel,
    /** Tài khoản gửi cụ thể (bắt buộc trước khi gửi duyệt; vắng → tài khoản đang kết nối đầu tiên của kênh). */
    account_id: z.string().uuid().optional(),
    segment_ids: z.array(z.string().uuid()).max(10).optional(),
    contact_ids: z.array(z.string().uuid()).max(5000).optional(),
    /** Lô nhập danh sách đã kiểm (campaign.audience_import) — id khách thật, không phải file. */
    audience_batch_id: z.string().uuid().optional(),
    content,
    ab: z.object({ text_b: z.string().max(4000) }).optional(),
    send: z.enum(['now', 'schedule', 'ai_time']).optional(),
    scheduled_at: z.string().optional(),
    suggestion_id: z.string().optional(),
    // Tạo từ gợi ý AI: tập người nhận = bộ lọc của gợi ý (snapshot lúc gửi duyệt) — không cần chọn thêm.
  }).refine((v) => (v.segment_ids?.length ?? 0) + (v.contact_ids?.length ?? 0) + (v.audience_batch_id ? 1 : 0) + (v.suggestion_id ? 1 : 0) > 0, { message: 'audience', path: ['contact_ids'] }),
  output: z.object({ campaign_id: z.string(), code: z.string(), est_recipients: z.number(), est_credits: z.number() }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
  uiTarget: opened,
});

export const campaignUpdate = defineAction({
  id: 'campaign.update',
  module: 'marketing',
  title: 'actions.campaign.update.title',
  description: 'Edit a draft or rejected campaign (name, content, audience, sender account, schedule); a rejected campaign returns to draft. Approved campaigns cannot be edited. Example: {"campaign_id":"0190f000-0000-7000-8000-000000000101","name":"Ra mắt BST Hè","content":{"text":"…"},"if_version":2}',
  input: z.object({
    campaign_id: campaignId,
    name: z.string().trim().min(1).max(160).optional(),
    content: content.optional(),
    ab: z.object({ text_b: z.string().max(4000) }).nullable().optional(),
    account_id: z.string().uuid().optional(),
    segment_ids: z.array(z.string().uuid()).max(10).optional(),
    contact_ids: z.array(z.string().uuid()).max(5000).optional(),
    send: z.enum(['now', 'schedule', 'ai_time']).optional(),
    scheduled_at: z.string().nullable().optional(),
    if_version: ifVersion,
  }),
  output: out,
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignSubmit = defineAction({
  id: 'campaign.submit',
  module: 'marketing',
  title: 'actions.campaign.submit.title',
  description: 'Submit a draft campaign for approval (draft → pending_approval): snapshots content, sender account, schedule and the de-duplicated recipient list (segments ∪ picked contacts) with eligibility.',
  input: z.object({ campaign_id: campaignId, if_version: ifVersion }),
  output: out,
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
});

export const campaignSendTest = defineAction({
  id: 'campaign.send_test',
  module: 'marketing',
  title: 'actions.campaign.send_test.title',
  description: 'Send a test message of the campaign to yourself.',
  input: z.object({ campaign_id: campaignId }),
  output: z.object({ sent_to: z.string() }),
  permission: 'campaign.manage',
  risk: 'send',
  agentGrantable: false,
  invalidates: [],
});

export const campaignApprove = defineAction({
  id: 'campaign.approve',
  module: 'marketing',
  title: 'actions.campaign.approve.title',
  description: 'Approve a pending campaign exactly as snapshotted (content, account, recipients); sending starts in the background at the scheduled time or right away. Always confirmed by a human; assistant / agents cannot approve.',
  input: z.object({ campaign_id: campaignId, if_version: ifVersion }),
  output: out.extend({ recipients: z.number() }),
  permission: 'campaign.approve',
  risk: 'send',
  agentGrantable: false,
  bulk: true,
  invalidates: ['marketing'],
});

export const campaignReject = defineAction({
  id: 'campaign.reject',
  module: 'marketing',
  title: 'actions.campaign.reject.title',
  description: 'Reject a pending campaign with a reason.',
  input: z.object({ campaign_id: campaignId, reason: z.string().trim().min(1).max(500), if_version: ifVersion }),
  output: out,
  permission: 'campaign.approve',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignPause = defineAction({
  id: 'campaign.pause',
  module: 'marketing',
  title: 'actions.campaign.pause.title',
  description: 'Pause a running or scheduled campaign: recipients not yet handed to the channel are held; messages already accepted by the channel are not recalled.',
  input: z.object({ campaign_id: campaignId, if_version: ifVersion }),
  output: out,
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignResume = defineAction({
  id: 'campaign.resume',
  module: 'marketing',
  title: 'actions.campaign.resume.title',
  description: 'Resume a paused campaign with the same approved snapshot (recipients are re-checked before each send).',
  input: z.object({ campaign_id: campaignId, if_version: ifVersion }),
  output: out,
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignCancel = defineAction({
  id: 'campaign.cancel',
  module: 'marketing',
  title: 'actions.campaign.cancel.title',
  description: 'Cancel a campaign that has not completed (a running one must be paused first); unsent recipients become skipped.',
  input: z.object({ campaign_id: campaignId, if_version: ifVersion }),
  output: out,
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['marketing'],
});

export const campaignDelete = defineAction({
  id: 'campaign.delete',
  module: 'marketing',
  title: 'actions.campaign.delete.title',
  description: 'Delete a draft / rejected / cancelled campaign.',
  input: z.object({ campaign_id: campaignId, if_version: ifVersion }),
  output: z.object({ campaign_id: z.string() }),
  permission: 'campaign.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['marketing'],
});
