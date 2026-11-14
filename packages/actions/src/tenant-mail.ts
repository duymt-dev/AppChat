// Mail của DN cho Email Marketing (TIP-012c §2.3): người tạo chiến dịch (campaign.manage) xem người gửi dùng được — KHÔNG cần
// integrations.manage, không thấy khoá / cấu hình kết nối. Cấu hình kết nối vẫn ở integration.connect / disconnect / test.
import { z } from 'zod';
import { mailSenderDtoSchema } from '@appchat/shared';
import { defineAction } from './define';

export const campaignMailSenders = defineAction({
  id: 'campaign.mail_senders',
  module: 'marketing',
  title: 'actions.campaign.mail_senders.title',
  description:
    'List the business mail senders (Brevo / SMTP connections) an email campaign can use, with state and why one is not usable yet. Never returns keys or connection settings. Pick one as {"sender":{"kind":"tenant_mail","connection_id":"…","sender_id":"…"}} in campaign.create / campaign.update. Example: {}',
  input: z.object({}),
  output: z.object({ senders: z.array(mailSenderDtoSchema) }),
  permission: 'campaign.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

/** Trợ lý / agent đọc một chiến dịch (TIP-012c §5.3): trạng thái, người gửi đã chốt, đếm kết quả giao thư theo biên nhận thật — không suy
 *  "đã giao / đã mở" từ việc đã gọi provider; mở thư chỉ khi có sự kiện. Nhận id, mã hoặc đúng tên. */
export const campaignGet = defineAction({
  id: 'campaign.get',
  module: 'marketing',
  title: 'actions.campaign.get.title',
  description:
    'Get one marketing campaign by id, code or exact name: status, channel, the approved sender, recipient counts and the actual email delivery evidence per state (queued / accepted by provider / delivered / unknown / failed / bounced / complained / unavailable). "accepted" means the provider took the email, NOT delivered; "unknown" means it is not known whether the provider received it — never resend those blindly. Example: {"campaign_id":"CMP-0012"}',
  input: z.object({ campaign_id: z.string().min(1).max(200) }),
  output: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    status: z.string(),
    channel: z.string(),
    sender: z.object({ kind: z.string(), email: z.string().nullable(), usable: z.boolean() }).nullable(),
    recipients: z.number(),
    delivery: z.record(z.string(), z.number()),
    opened: z.number().nullable(),
  }),
  permission: 'campaign.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'campaign', id: o.id, view: 'drawer' }),
});
