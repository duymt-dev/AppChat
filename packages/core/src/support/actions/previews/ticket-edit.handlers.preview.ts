// Preview sửa ticket (TIP-023b R2.8): sửa / gán → mã + tiêu đề, trước / sau cột đổi (người phụ trách theo tên); bình luận → nội dung + nội bộ /
// trả lời khách (kênh); hàng loạt → số ticket còn mở sẽ đổi. Ticket ngoài scope → 404 như execute. Chỉ đọc — không khoá dòng.
import type { ActionInput, ActionPreview, ticketAssign, ticketBulkUpdate, ticketComment, ticketUpdate } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, defined, line, preview, updated } from '../../../kernel/actions/preview-kit';
import type { CrmMembers } from '../../../crm/public';
import { visibleTicket, type TicketRecord } from '../../ticket-access';

export const label = (t: TicketRecord) => line(t.code, t.title);

export async function who(tx: TenantTx, members: CrmMembers, user: string | null | undefined, agent: string | null | undefined) {
  if (user) return (await members.names([user])).get(user) ?? user;
  if (agent) return (await tx.aiAgent.findFirst({ where: { id: agent }, select: { name: true } }))?.name ?? agent;
  return null;
}

export async function updatePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof ticketUpdate>): Promise<ActionPreview> {
  const t = await visibleTicket(tx, a, i.ticket_id);
  const custom = (t.custom ?? {}) as Record<string, unknown>;
  const cur = { title: t.title, description: t.description, category: t.category, priority: t.priority, ...(i.custom ? { custom: Object.fromEntries(Object.keys(i.custom).map((k) => [k, custom[k] ?? null])) } : {}) };
  return preview('write', label(t), { changes: updated('ticket', t.id, cur, { title: i.title?.trim(), description: i.description?.trim(), category: i.category?.trim(), priority: i.priority, custom: i.custom }) });
}

export async function assignPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof ticketAssign>): Promise<ActionPreview> {
  const t = await visibleTicket(tx, a, i.ticket_id);
  const [from, to] = [await who(tx, members, t.assigneeUserId, t.assigneeAgentId), await who(tx, members, i.assignee_user_id, i.assignee_agent_id)];
  return preview('write', line(label(t), to), { changes: updated('ticket', t.id, { assignee: from }, { assignee: to }) });
}

export async function bulkPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof ticketBulkUpdate>): Promise<ActionPreview> {
  let n = 0;
  for (const id of new Set(i.ticket_ids)) if ((await visibleTicket(tx, a, id)).status !== 'closed') n++;
  const assignee = await who(tx, members, i.assignee_user_id, i.assignee_agent_id);
  return preview('write', `${n}`, { count: n, changes: [{ entity: 'ticket', after: defined({ assignee: assignee ?? undefined, priority: i.priority }) }] });
}

export async function commentPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof ticketComment>): Promise<ActionPreview> {
  const t = await visibleTicket(tx, a, i.ticket_id);
  const conv = !i.internal && t.conversationId ? await tx.conversation.findUnique({ where: { id: t.conversationId }, select: { channelType: true, archivedAt: true } }) : null;
  const channel = conv && !conv.archivedAt ? conv.channelType : undefined;
  return preview('write', label(t), { changes: [created('ticket_comment', { body: i.body.trim(), internal: i.internal, channel })] });
}

