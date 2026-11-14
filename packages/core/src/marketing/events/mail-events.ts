// Tác dụng miền của sự kiện giao thư đã xác thực (TIP-012c §4.3) — chạy CÙNG transaction với việc tiêu thụ sự kiện (integrations/mail/
// results.ts), nên phát lại / hai đối soát chỉ một lần. Chỉ cho biên nhận gửi thật đã ghép (`cr_<recipient>`); không tạo chiến dịch /
// người nhận / khách / lượt gửi. Lỗi cứng (hard bounce / invalid / blocked) + khiếu nại → chặn email ưu đãi của ĐÚNG khách đó theo chính
// sách huỷ nhận 037 (`marketing_opt_out`, người nhận chưa gọi kênh của các chiến dịch khác → skipped opt_out) — không xoá định danh CRM,
// không chặn OTP / Hộp thư. Mở thư → `read_at` (một lần, không suy "chưa đọc" khi không có sự kiện). Huỷ nhận từ provider KHÔNG được áp
// (huỷ nhận chỉ qua link ký 037).
import type { MailEventSink } from '../../integrations/mail/results';
import { recipientOfRef } from '../jobs/campaign-dispatch';

const SUPPRESS = new Set(['hard_bounce', 'invalid', 'blocked', 'complaint']);

export const campaignMailEvents: MailEventSink = async (tx, { delivery, type, occurredAt, now }) => {
  const rid = delivery.recipientId ?? recipientOfRef(delivery.dispatchRef);
  if (!rid) return;
  const r = await tx.campaignRecipient.findUnique({ where: { id: rid }, select: { id: true, contactId: true, campaignId: true, readAt: true } });
  if (!r || r.campaignId !== delivery.campaignId) return;
  if (type === 'opened' && !r.readAt) await tx.campaignRecipient.update({ where: { id: r.id }, data: { readAt: occurredAt, updatedAt: now } });
  if (!SUPPRESS.has(type)) return;
  await tx.contact.updateMany({ where: { id: r.contactId, marketingOptOut: false }, data: { marketingOptOut: true } });
  await tx.$executeRaw`DELETE FROM campaign_contact_touch WHERE contact_id = ${r.contactId}::uuid AND state = 'reserved'
    AND recipient_id IN (SELECT id FROM campaign_recipient WHERE contact_id = ${r.contactId}::uuid AND status = 'pending' AND send_state = 'none')`;
  await tx.$executeRaw`UPDATE campaign_recipient SET status = 'skipped', skip_reason = 'opt_out', updated_at = ${now}
    WHERE contact_id = ${r.contactId}::uuid AND status = 'pending' AND send_state = 'none'`;
};
