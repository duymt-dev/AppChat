// Ghi ticket dùng chung handler + consumer + job (Blueprint §2.2 / §3.4 support, REQ-H01–H04): chuyển trạng thái theo TICKET_FLOW,
// lịch sử (`ticket_event`), event outbox, dòng thời gian khách (hồ sơ 360°), tên người thao tác.
import { assertTransition, TICKET_FLOW, type TicketStatusKey } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId, writeTimeline, type CrmMembers, type TimelineInput } from '../../crm/public';
import type { TicketRecord } from '../ticket-access';

export type Ev = { topic: string; payload: Record<string, unknown> };
export type Actor = { type: string; id: string | null; name: string };

export const ticketPayload = (t: TicketRecord, extra: Record<string, unknown> = {}) => ({
  ticket_id: t.id,
  code: t.code,
  title: t.title,
  contact_id: t.contactId,
  conversation_id: t.conversationId,
  assignee_user_id: t.assigneeUserId,
  assignee_agent_id: t.assigneeAgentId,
  status: t.status,
  priority: t.priority,
  // Lọc người nhận realtime theo policy support (TIP-042c): nhóm + người tạo.
  team_id: t.teamId,
  created_by_user_id: t.createdByType === 'user' ? t.createdById : null,
  ...extra,
});

export const evOf = (topic: string, t: TicketRecord, extra: Record<string, unknown> = {}): Ev => ({ topic, payload: ticketPayload(t, extra) });

/** Người thao tác (tên hiển thị trong lịch sử / bình luận). Agent → tên agent; hệ thống → rỗng. */
export async function actorOf(ctx: ActionContext, tx: TenantTx, members: CrmMembers): Promise<Actor> {
  if (ctx.actor.type === 'agent') {
    const a = await tx.aiAgent.findUnique({ where: { id: ctx.actor.id }, select: { name: true } }).catch(() => null);
    return { type: 'agent', id: ctx.actor.id, name: a?.name ?? '' };
  }
  const uid = actorUserId(ctx);
  if (!uid) return { type: 'system', id: null, name: '' };
  return { type: 'user', id: uid, name: (await members.names([uid])).get(uid) ?? '' };
}

export const SYSTEM_ACTOR: Actor = { type: 'system', id: null, name: '' };

export async function logEvent(tx: TenantTx, ticketId: string, type: string, actor: Actor, now: Date, data: Record<string, unknown> = {}) {
  await tx.ticketEvent.create({ data: { id: uuidv7(now.getTime()), ticketId, type, actorType: actor.type, actorId: actor.id, actorName: actor.name, data: data as object, createdAt: now } });
}

export function step(t: Pick<TicketRecord, 'status'>, action: string): TicketStatusKey {
  return assertTransition(TICKET_FLOW, t.status, action);
}

export async function timeline(tx: TenantTx, t: TicketRecord, key: TimelineInput['key'], params: Record<string, string | number>, actor: Actor, now: Date) {
  if (!t.contactId) return;
  await writeTimeline(tx, { contactId: t.contactId, type: 'ticket', key, params: { code: t.code, ...params }, actor: { type: actor.type, id: actor.id }, ref: { type: 'ticket', id: t.id }, at: now });
}
