// Gửi một người nhận chiến dịch (TIP-037, DC-240): dựng tin từ BẢN ĐÃ DUYỆT (nội dung / biến thể / tài khoản) + link huỷ nhận tin; kiểm lại
// ngay trước khi gọi kênh (chiến dịch còn đang chạy, đúng version đã duyệt, khách chưa huỷ nhận tin / chưa bị xoá) rồi ĐẶT CHỖ bền
// (`send_state = reserved`) — sập sau khi gọi kênh: lần chạy lại thấy đặt chỗ → kết quả `unknown`, không gửi mù lần hai. Kết quả kênh ghi
// qua campaign-results (action hệ thống campaign.record_delivery). Không hứa exactly-once: kênh không có idempotency.
import type { OutboundMessage } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import type { CampaignChannel } from '@appchat/shared';
import { renderContent, type CampaignContent } from '../services/campaign-policy';
import { unsubUrl, type UnsubLinks } from '../services/unsubscribe-token';

export const RECIPIENT_REF_PREFIX = 'cr_';
export const refOf = (recipientId: string) => `${RECIPIENT_REF_PREFIX}${recipientId}`;
export const recipientOfRef = (ref: string) => (ref.startsWith(RECIPIENT_REF_PREFIX) ? ref.slice(RECIPIENT_REF_PREFIX.length) : null);

const FOOTER: Record<CampaignChannel, (url: string) => string> = {
  zalo: (url) => `\n\nKhông muốn nhận tin ưu đãi? Bấm: ${url}`,
  email: (url) => `\n\n—\nHuỷ nhận email ưu đãi: ${url}`,
};

/** Biến của khách cho nội dung (chỉ dữ liệu cho phép: tên, mã khách, hạng). */
export async function varsOf(db: Pick<TenantDb, 'contact'>, contactId: string) {
  const c = await db.contact.findUnique({ where: { id: contactId }, select: { name: true, code: true, tierKey: true } });
  return { ten: c?.name ?? null, ma_khach: c?.code ?? null, hang: c?.tierKey ?? null };
}

export interface BuiltMessage {
  accountId: string;
  message: OutboundMessage;
}

/**
 * Tin của một người nhận. Zalo: vào hội thoại 1-1 đã có (không gửi lạnh tới SĐT — manifest proactive disallowed). Email: thư mới tới địa
 * chỉ của khách (mỗi người nhận một Message-ID riêng → khách trả lời quay về đúng hội thoại).
 */
export async function buildMessage(
  db: Pick<TenantDb, 'contact' | 'conversation'>,
  c: { id: string; channel: string; accountId: string | null; content: unknown; ab: unknown },
  r: { id: string; contactId: string; conversationId: string | null; endpoint: string; variant: string },
  links: UnsubLinks | null,
  ws: string,
  now: Date,
): Promise<BuiltMessage | null> {
  const channel = c.channel as CampaignChannel;
  if (!c.accountId) return null;
  const content = c.content as CampaignContent;
  const ab = c.ab as { text_b?: string } | null;
  const vars = await varsOf(db, r.contactId);
  const body = renderContent(r.variant === 'b' && ab?.text_b ? ab.text_b : content.text, vars);
  const text = links ? body + FOOTER[channel](unsubUrl(links, ws, r.id, now)) : body;
  if (channel === 'zalo') {
    const conv = r.conversationId ? await db.conversation.findUnique({ where: { id: r.conversationId }, select: { externalThreadId: true, channelAccountId: true, archivedAt: true } }) : null;
    if (!conv || conv.archivedAt || conv.channelAccountId !== c.accountId) return null;
    return { accountId: c.accountId, message: { externalThreadId: conv.externalThreadId, isGroup: false, kind: 'text', text } };
  }
  if (!r.endpoint) return null;
  const subject = renderContent(content.subject ?? '', vars);
  const domain = r.endpoint.split('@')[1] ?? 'mail';
  const messageId = `<campaign-${r.id}@${domain}>`;
  return { accountId: c.accountId, message: { externalThreadId: messageId, kind: 'text', text, externalThreadTo: r.endpoint, meta: { subject, messageId } } };
}

export type ReserveOutcome = 'reserved' | 'already' | 'rejected';

/**
 * Kiểm lại + đặt chỗ ngay trước provider (một transaction, khoá dòng người nhận). Bị loại → ghi skipped + nhả khoá 48 giờ (chưa gọi kênh).
 * Đã đặt chỗ ở lần chạy trước (sập giữa chừng) → `already`: KHÔNG gửi lại, ghi kết quả unknown.
 */
export async function reserveRecipient(db: TenantDb, recipientId: string, now: Date): Promise<ReserveOutcome> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: string; send_state: string; campaign_id: string; contact_id: string }[]>`
      SELECT status, send_state, campaign_id, contact_id FROM campaign_recipient WHERE id = ${recipientId}::uuid FOR UPDATE`;
    const r = rows[0];
    if (!r || r.status !== 'pending') return 'rejected';
    if (r.send_state !== 'none') return 'already';
    const c = await tx.campaign.findUnique({ where: { id: r.campaign_id }, select: { status: true, deletedAt: true, approvedVersion: true, version: true } });
    const k = await tx.contact.findUnique({ where: { id: r.contact_id }, select: { marketingOptOut: true, deletedAt: true } });
    const reason = !c || c.deletedAt || c.status !== 'running' || !c.approvedVersion ? 'paused' : !k || k.deletedAt ? 'deleted' : k.marketingOptOut ? 'opt_out' : null;
    if (reason === 'paused') {
      // Tạm dừng / huỷ sau khi đã xếp hàng: trả người nhận về chưa nhận lô (tiếp tục sẽ nhận lại), nhả khoá 48 giờ.
      await tx.campaignRecipient.update({ where: { id: recipientId }, data: { claimedAt: null, updatedAt: now } });
      await tx.$executeRaw`DELETE FROM campaign_contact_touch WHERE recipient_id = ${recipientId}::uuid AND state = 'reserved'`;
      return 'rejected';
    }
    if (reason) {
      await tx.campaignRecipient.update({ where: { id: recipientId }, data: { status: 'skipped', skipReason: reason, updatedAt: now } });
      await tx.$executeRaw`DELETE FROM campaign_contact_touch WHERE recipient_id = ${recipientId}::uuid AND state = 'reserved'`;
      return 'rejected';
    }
    await tx.campaignRecipient.update({ where: { id: recipientId }, data: { sendState: 'reserved', attemptedAt: now, attempts: { increment: 1 }, updatedAt: now } });
    return 'reserved';
  });
}
