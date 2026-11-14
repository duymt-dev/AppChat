// Nguồn "tin chọn của hội thoại" cho kỹ năng tiện ích (TIP-019c §2.1): hội thoại theo scope inbox hiện tại (không thấy → 404), agent trực
// kênh chỉ hội thoại mình đang trực; tin đích danh ≤ 30 lọc TRONG SQL theo đúng hội thoại trước khi đọc nội dung (PK + `message
// (conversation_id, created_at, id)`), chưa xoá / chưa thu hồi; ghi chú nội bộ chỉ khi người gọi có inbox.reply (quyền ghi chú) và chọn rõ. Không kéo tệp
// đính kèm / lịch sử cũ hơn / danh tính bên thứ ba của nhóm — chỉ vai người gửi (khách / nhân viên / AI).
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { UUID, visibleConversation } from '../../../inbox/services/access';
import type { SourceChunk } from './types';

const ROLE: Record<string, string> = { contact: 'customer', user: 'staff', agent: 'ai', system: 'system' };

export interface ConversationSource {
  conversationId: string;
  contactId: string | null;
  chunks: SourceChunk[];
}

export async function conversationSource(
  tx: TenantTx,
  authz: AuthzContext,
  input: { conversation_id: string; message_ids: string[] },
  served?: string,
): Promise<ConversationSource> {
  if (served && served !== input.conversation_id) throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_found' });
  const c = await visibleConversation(tx, authz, input.conversation_id);
  const ids = [...new Set(input.message_ids)];
  if (ids.some((x) => !UUID.test(x))) throw new AppError('NOT_FOUND', 404, { message_ids: 'not_found' });
  const rows = await tx.message.findMany({
    where: { id: { in: ids }, conversationId: c.id, deletedAt: null, recalledAt: null },
    select: { id: true, kind: true, senderType: true, body: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  if (rows.length !== ids.length) throw new AppError('NOT_FOUND', 404, { message_ids: 'not_found' });
  const notes = authz.isOwner || authz.permissions.has('inbox.reply');
  if (rows.some((m) => m.kind === 'note' && !notes)) throw new AppError('NOT_FOUND', 404, { message_ids: 'not_found' });
  const chunks = rows
    .filter((m) => m.body.trim() && m.kind !== 'system')
    .map((m) => ({ id: `m:${m.id}`, text: m.body, label: `${ROLE[m.senderType] ?? 'system'}${m.kind === 'note' ? ' (internal note)' : ''} · ${m.createdAt.toISOString().slice(0, 16)}`, binding: { message_id: m.id } }));
  if (!chunks.length) throw new AppError('VALIDATION_FAILED', 422, { message_ids: 'empty' });
  return { conversationId: c.id, contactId: c.contactId, chunks };
}
