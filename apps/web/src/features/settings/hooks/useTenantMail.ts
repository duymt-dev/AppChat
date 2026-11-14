// Mail của DN cho Email Marketing (TIP-012c §5.1): người gửi dùng được (GET /v1/campaigns/mail-senders — campaign.manage, không khoá /
// cấu hình) + thẻ connector Brevo / SMTP (Nền tảng kết nối). Khoá `integrations` → integration.connect / disconnect làm mới danh sách.
'use client';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { MailSenderDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useCan } from '@/shared/authz/useCan';
import { connectorsQuery } from '../api';

export const MAIL_CONNECTORS = ['brevo', 'smtp'] as const;
export type MailConnector = (typeof MAIL_CONNECTORS)[number];

export const mailSendersQuery = () =>
  queryOptions({ queryKey: ['integrations', 'mail-senders'], queryFn: () => transport.get<MailSenderDto[]>('/campaigns/mail-senders') });

export function useTenantMail() {
  const canManage = useCan('integrations.manage');
  const canCampaign = useCan('campaign.manage');
  const senders = useQuery({ ...mailSendersQuery(), enabled: canCampaign });
  const connectors = useQuery({ ...connectorsQuery(), enabled: canManage });
  const cards = (connectors.data ?? []).filter((c) => (MAIL_CONNECTORS as readonly string[]).includes(c.key));
  return { senders, connectors, cards, canManage, canCampaign };
}
