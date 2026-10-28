// Marketing (Blueprint §3.4 marketing; §2.2 segment / campaign / campaign_suggestion). Prototype L3394–3870.
// Kênh chỉ Zalo cá nhân + Email. draft → pending_approval → approved/scheduled → running → completed; rejected / paused / cancelled.
// campaign.approve là lệnh gửi hàng loạt — luôn xác nhận (risk send).
import { z } from 'zod';
import { defineAction } from './define';

const campaignId = z.string().min(1);
const channel = z.enum(['zalo', 'email']);
const out = z.object({ campaign_id: z.string(), status: z.string() });
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
  description: 'Count contacts matching a segment (by saved segment ids) before creating a campaign. Example: {"segment_ids":["vip"]}',
  input: z.object({ segment_ids: z.array(z.string()).min(1), channel: channel.optional() }),
  output: z.object({ count: z.number(), reachable: z.number() }),
  permission: 'campaign.view',
  risk: 'read',
  agentGrantable: true,
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
  invalidates: [],
});

export const campaignCreate = defineAction({
  id: 'campaign.create',
  module: 'marketing',
  title: 'actions.campaign.create.title',
  description:
    'Create a draft campaign for a segment on Zalo personal or Email. Example: {"name":"Win-back 60 ngày","channel":"zalo","segment_ids":["inactive60"],"content":{"text":"Chào {ten}…"}}',
  input: z.object({
    name: z.string().trim().min(1).max(160),
    kind: z.enum(['reactivation', 'upsell', 'conversion', 'aftercare', 'manual']).optional(),
    channel,
    segment_ids: z.array(z.string()).min(1),
    content: z.object({ subject: z.string().max(200).optional(), text: z.string().trim().min(1).max(4000), cta: z.string().max(120).optional() }),
    ab: z.object({ text_b: z.string().max(4000) }).optional(),
    scheduled_at: z.string().optional(),
    suggestion_id: z.string().optional(),
  }),
  output: z.object({ campaign_id: z.string(), code: z.string(), est_recipients: z.number(), est_credits: z.number() }),
  permission: 'campaign.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['marketing'],
  uiTarget: opened,
});

export const campaignSubmit = defineAction({
  id: 'campaign.submit',
  module: 'marketing',
  title: 'actions.campaign.submit.title',
  description: 'Submit a draft campaign for approval (draft → pending_approval).',
  input: z.object({ campaign_id: campaignId }),
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
  description: 'Approve and send (or schedule) a pending campaign to all recipients. Always confirmed by a human.',
  input: z.object({ campaign_id: campaignId }),
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
  input: z.object({ campaign_id: campaignId, reason: z.string().trim().min(1).max(500) }),
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
  description: 'Pause a running or scheduled campaign.',
  input: z.object({ campaign_id: campaignId }),
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
  description: 'Resume a paused campaign.',
  input: z.object({ campaign_id: campaignId }),
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
  description: 'Cancel a campaign that has not completed.',
  input: z.object({ campaign_id: campaignId }),
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
  input: z.object({ campaign_id: campaignId }),
  output: z.object({ campaign_id: z.string() }),
  permission: 'campaign.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['marketing'],
});
