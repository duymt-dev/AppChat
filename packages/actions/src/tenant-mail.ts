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
