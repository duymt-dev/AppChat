// Gửi thử chiến dịch qua mail của DN (TIP-012c §3.1): sau khi campaign.send_test đã kiểm campaign.manage + địa chỉ của chính người bấm.
// Biên nhận `test_send` riêng (dispatch_ref `ct_<id>`, test_invocation_id, digest địa chỉ người bấm — không lưu địa chỉ / nội dung), một
// lượt gọi integrations; worker lấy lại địa chỉ người bấm lúc gửi và đối digest. Kết quả chỉ cập nhật biên nhận này — không thống kê,
// không khoá 48 giờ, không huỷ nhận tin, không bao giờ thành gửi thật. Người gửi phải còn đúng phiên bản đã chọn.
import { AppError } from '@appchat/shared';
import { recipientDigest } from '@appchat/integrations';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { createDelivery } from '../../integrations/mail/receipts';
import { queueMailSend } from '../../integrations/mail/dispatch';
import { logEvent, type CampaignRow } from '../repos/campaigns.repo';
import { assertMailSenderCurrent } from './mail-sender';

export async function queueMailTest(tx: TenantTx, _ws: string, c: CampaignRow, me: { userId: string; email: string; name: string }, now: Date): Promise<HandlerOutcome<{ sent_to: string; delivery_ref: string }>> {
  const s = await assertMailSenderCurrent(tx, c);
  if (!s.connection_id) throw new AppError('INVALID_STATE', 409, { sender: 'not_found' });
  const test = uuidv7(now.getTime());
  const { row } = await createDelivery(tx, { dispatchRef: `ct_${test}`, connectionId: c.mailConnectionId!, subjectKind: 'test_send', campaignId: c.id, testInvocationId: test, senderId: c.mailSenderId!, senderRev: c.mailSenderRev!, recipientDigest: recipientDigest(me.email) }, now);
  await queueMailSend(tx, row, { configRev: row.senderRev, requestedBy: me.userId, at: now }, now);
  await logEvent(tx, c.id, 'test_sent', { userId: me.userId, name: me.name }, now, { to: me.email.replace(/^(.).*(@.*)$/, '$1***$2'), via: 'tenant_mail' });
  return { result: { sent_to: me.email, delivery_ref: row.dispatchRef } };
}
