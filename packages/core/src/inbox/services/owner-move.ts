// Chuyển phụ trách khách có chọn "chuyển kèm hội thoại" (D32, REQ-F01b): hội thoại đang mở của khách gán cho người mới — gọi
// trong transaction của `contact.transfer_owner` (crm) để `moved.conversations` trả đúng số. Không import crm (tránh vòng).
import type { TenantTx } from '../../kernel/actions/action-context';

export async function moveOpenConversations(tx: TenantTx, contactId: string, to: string, contactName: string, team: string | null = null) {
  const convs = await tx.conversation.findMany({
    where: { contactId, archivedAt: null, status: { not: 'closed' }, OR: [{ assigneeUserId: null }, { assigneeUserId: { not: to } }] },
    select: { id: true, channelAccountId: true, title: true, assigneeUserId: true, teamId: true },
  });
  // DC-299: hội thoại chuyển theo nhóm mới của khách (TIP-042c).
  if (convs.length) await tx.conversation.updateMany({ where: { id: { in: convs.map((c) => c.id) } }, data: { assigneeUserId: to, teamId: team } });
  const events = convs.map((c) => ({
    topic: 'conversation.assigned',
    payload: { conversation_id: c.id, channel_account_id: c.channelAccountId, contact_id: contactId, assignee_user_id: to, contact_owner_user_id: to, team_id: team, assignee_agent_id: null, by_user_id: null, auto: true, title: c.title ?? contactName },
  }));
  return { moved: convs.length, before: convs.map((c) => ({ id: c.id, assignee: c.assigneeUserId, team: c.teamId })), events };
}

/** Hoàn tác: trả người được gán cũ cho các hội thoại còn đang gán người mới. */
export async function restoreConversationAssignees(tx: TenantTx, rows: { id: string; assignee: string | null; team?: string | null }[], to: string) {
  for (const r of rows) await tx.conversation.updateMany({ where: { id: r.id, assigneeUserId: to }, data: { assigneeUserId: r.assignee, ...(r.team !== undefined ? { teamId: r.team } : {}) } });
}
