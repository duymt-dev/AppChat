// Preview trạng thái hội thoại (TIP-023b R2.8): mark_read · set_status · pin · archive · hide · set_ai_mode · handoff · clear_history.
// Tóm tắt = tên hội thoại (khách / nhóm); changes = trước / sau cột đổi; clear_history nêu số tin bị ẩn khỏi AppChat. Hội thoại ngoài scope
// → 404 / 403 như execute (writableConversation). Chỉ đọc.
import type {
  ActionInput,
  ActionPreview,
  conversationArchive,
  conversationClearHistory,
  conversationHandoff,
  conversationHide,
  conversationMarkRead,
  conversationPin,
  conversationSetAiMode,
  conversationSetStatus,
} from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { writableConversation } from '../../services/access';

type Conv = Awaited<ReturnType<typeof writableConversation>>;

/** Tên hiển thị của hội thoại: tiêu đề, không có thì tên khách. */
export async function convTitle(tx: TenantTx, c: Conv): Promise<string> {
  if (c.title) return c.title;
  if (!c.contactId) return '';
  return (await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } }))?.name ?? '';
}

/** Hội thoại + tên + một dòng trước / sau cho các cột đổi. */
export async function convPreview(tx: TenantTx, a: AuthzContext, id: string, risk: ActionPreview['risk'], cur: (c: Conv) => Record<string, unknown>, patch: Record<string, unknown>, more: Partial<ActionPreview> = {}) {
  const c = await writableConversation(tx, a, id);
  return preview(risk, await convTitle(tx, c), { changes: updated('conversation', c.id, cur(c), patch), ...more });
}

export const markReadPreview = (tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationMarkRead>) => convPreview(tx, a, i.conversation_id, 'write', (c) => ({ unread: c.unreadCount }), { unread: 0 });

export const setStatusPreview = (tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationSetStatus>) =>
  convPreview(tx, a, i.conversation_id, 'write', (c) => ({ status: c.status }), {
    status: i.status,
    ...(i.snoozed_until ? { snoozed_until: i.snoozed_until } : i.snooze_hours ? { snooze_hours: i.snooze_hours } : {}),
  });

export const pinPreview = (tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationPin>) => convPreview(tx, a, i.conversation_id, 'write', (c) => ({ pinned: c.pinned }), { pinned: i.pinned });

export const archivePreview = (tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationArchive>) => convPreview(tx, a, i.conversation_id, 'write', (c) => ({ archived: !!c.archivedAt }), { archived: true });

export const hidePreview = (tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationHide>) => convPreview(tx, a, i.conversation_id, 'write', (c) => ({ hidden: !!c.hiddenAt }), { hidden: i.hidden });

export const setAiModePreview = (tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationSetAiMode>) => convPreview(tx, a, i.conversation_id, 'write', (c) => ({ ai_mode: c.aiMode }), { ai_mode: i.ai_mode });

/** Nhận lại hội thoại AI đã chuyển: gán cho người ra lệnh, AI tự trả lời → gợi ý. */
export async function handoffPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationHandoff>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const cur = { assignee_user_id: c.assigneeUserId, ai_mode: c.aiMode, ai_state: c.aiState };
  return preview('write', await convTitle(tx, c), { changes: updated('conversation', c.id, cur, { assignee_user_id: a.userId, ai_mode: c.aiMode === 'auto' ? 'copilot' : c.aiMode, ai_state: 'idle' }) });
}

export async function clearHistoryPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationClearHistory>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const n = await tx.message.count({ where: { conversationId: c.id, ...(c.clearedAt ? { createdAt: { gt: c.clearedAt } } : {}) } });
  return preview('delete', await convTitle(tx, c), { count: n, changes: [{ entity: 'conversation', id: c.id, before: { messages: n }, after: { messages: 0 } }] });
}
