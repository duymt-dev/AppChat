// Liên kết hội thoại nguồn khi tạo chứng từ từ Hộp thư (TIP-025b §D.1–2) — dùng chung quote / order / contract / ticket / appointment.
// Chỉ kiểm liên kết: hội thoại người gọi THẤY được (ngoài scope → 404 như không tồn tại), tin nguồn thuộc đúng hội thoại và còn hiện,
// khách khớp — 1-1: khách của hội thoại (chưa liên kết khách / khác khách → 422 rõ, không bao giờ âm thầm bỏ liên kết); nhóm: khách
// phải được chọn rõ và là thành viên đã liên kết của nhóm (không tự lấy thành viên đầu). Liên kết KHÔNG cấp quyền CRM / commerce —
// handler domain vẫn kiểm quyền tạo / sửa của mình.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, visibleConversation } from './access';

export interface LinkInput {
  conversation_id?: string | null;
  source_message_id?: string | null;
}

export interface ConversationLink {
  conversationId: string | null;
  messageId: string | null;
  /** Khách sau khi đối chiếu: khách chọn rõ, hoặc khách của hội thoại 1-1 khi không chọn. */
  contactId: string | null;
}

const bad = (field: string, why: string): never => {
  throw new AppError('VALIDATION_FAILED', 422, { [field]: why });
};

/** Tin nguồn còn hiện trong hội thoại — tin xoá / thu hồi / hội thoại khác → 404 cùng mã (không lộ). */
async function sourceMessage(tx: TenantTx, id: string) {
  const m = UUID.test(id) ? await tx.message.findUnique({ where: { id }, select: { id: true, conversationId: true, deletedAt: true, recalledAt: true } }) : null;
  if (!m || m.deletedAt || m.recalledAt) throw new AppError('NOT_FOUND', 404, { source_message_id: 'not_found' });
  return m;
}

/**
 * Kiểm + chuẩn hoá liên kết. Không có hội thoại / tin → giữ nguyên khách (tạo độc lập như cũ). Chứng từ bắt buộc có khách (báo giá /
 * đơn / hợp đồng) dùng `contactId` trả về; quyền trên khách vẫn do handler domain kiểm.
 */
export async function linkConversation(tx: TenantTx, authz: AuthzContext, contactId: string | null | undefined, i: LinkInput, o: { served?: string } = {}): Promise<ConversationLink> {
  const msg = i.source_message_id ? await sourceMessage(tx, i.source_message_id) : null;
  const convId = i.conversation_id ?? msg?.conversationId ?? null;
  if (!convId) return { conversationId: null, messageId: null, contactId: contactId ?? null };
  if (msg && msg.conversationId !== convId) throw new AppError('NOT_FOUND', 404, { source_message_id: 'not_found' });
  // Hội thoại agent đang phục vụ (server suy ra, `ActionContext.servedConversationId`) — không bắt scope người dùng.
  const served = o.served && o.served === convId ? await tx.conversation.findUnique({ where: { id: convId } }) : null;
  const c = served ?? (await visibleConversation(tx, authz, convId));
  if (c.kind === 'group') {
    if (!contactId) return bad('contact_id', 'required_for_group');
    const p = await tx.conversationParticipant.findFirst({ where: { conversationId: c.id, contactId }, select: { externalId: true } });
    if (!p) bad('contact_id', 'not_group_participant');
    return { conversationId: c.id, messageId: msg?.id ?? null, contactId: contactId! };
  }
  if (!c.contactId) return bad('conversation_id', 'contact_unlinked');
  if (contactId && contactId !== c.contactId) bad('contact_id', 'conversation_mismatch');
  return { conversationId: c.id, messageId: msg?.id ?? null, contactId: c.contactId };
}
