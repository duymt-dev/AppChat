// Shape người gửi mail của DN (TIP-012c §2.3): GET /v1/campaigns/mail-senders + action campaign.mail_senders — chỉ định danh người gửi
// dùng được + năng lực (không khoá, không cấu hình kết nối). `sender_rev` = phiên bản khoá / cấu hình kết nối lúc chọn: chiến dịch chốt
// cùng bản duyệt; kết nối đổi (kết nối lại / ngắt / sửa người gửi) → bản duyệt cũ không còn khớp.
import { z } from 'zod';

/** Trạng thái người gửi theo bằng chứng thăm dò — "kết nối được" không đồng nghĩa "đã giao". */
export const MAIL_SENDER_STATES = ['configured', 'unverified', 'authenticated_transport', 'sender_verified', 'unsupported', 'degraded'] as const;
export type MailSenderState = (typeof MAIL_SENDER_STATES)[number];

export const mailSenderDtoSchema = z.object({
  connection_id: z.string(),
  connector: z.string(),
  connection_name: z.string(),
  sender_id: z.string(),
  email: z.string(),
  name: z.string(),
  state: z.enum(MAIL_SENDER_STATES),
  /** provider_api (Brevo: người gửi do provider xác minh) | authenticated_transport (SMTP: chỉ đăng nhập + TLS, không chứng minh tên miền). */
  transport: z.enum(['provider_api', 'authenticated_transport']),
  /** Provider có sự kiện giao / mở / nhấp (SMTP: không). */
  events: z.boolean(),
  sender_rev: z.number().int(),
  usable: z.boolean(),
  /** Lý do không dùng được (đã làm sạch): probe_pending | probe_failed | sender_unconfirmed | sender_inactive | sandbox. */
  reason: z.string().nullable(),
  probed_at: z.string().nullable(),
});
export type MailSenderDto = z.infer<typeof mailSenderDtoSchema>;

/** Người gửi đã chốt của chiến dịch (đọc) — channel_account như cũ hoặc mail của DN. */
export const campaignSenderSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('channel_account'), account_id: z.string().nullable() }),
  z.object({ kind: z.literal('tenant_mail'), connection_id: z.string(), sender_id: z.string(), sender_rev: z.number().int(), email: z.string(), name: z.string(), usable: z.boolean(), reason: z.string().nullable() }),
]);
export type CampaignSender = z.infer<typeof campaignSenderSchema>;

/** Đầu vào campaign.create / update: chọn TƯỜNG MINH (không lùi sang kết nối mới nhất) — kênh như account_id cũ, hoặc mail của DN. */
export const campaignSenderInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('channel_account'), account_id: z.string().uuid() }),
  z.object({ kind: z.literal('tenant_mail'), connection_id: z.string().uuid(), sender_id: z.string().min(1).max(200) }),
]);
export type CampaignSenderInput = z.infer<typeof campaignSenderInputSchema>;
