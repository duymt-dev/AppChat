// ticket.assign · comment · update · bulk_update (Blueprint §3.4 support, REQ-H01 / H03). Phụ trách = một người (thành viên active) HOẶC
// một agent (tồn tại). Bình luận: ghi chú nội bộ hoặc trả lời khách — trả lời đầu tiên của người / agent chốt phản hồi đầu (dừng đồng hồ
// FRT); ticket gắn hội thoại thì trả lời gửi luôn vào hội thoại đó. Sửa: tiêu đề / mô tả / danh mục / ưu tiên / trường tuỳ biến.
// Đã đóng → chỉ bình luận nội bộ. Hoàn tác 24 giờ.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, validateCustomValues } from '@appchat/shared';
import type { ActionInput, ticketAssign, ticketBulkUpdate, ticketComment, ticketUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, actorUserId, fieldDefs } from '../../crm/public';
import { enqueueOutgoing, writeOutgoing, type Outgoing } from '../../inbox/public';
import { UUID, lockTicket, type TicketRecord } from '../ticket-access';
import { actorOf, evOf, logEvent, type Ev } from '../services/ticket-write';

type Out = { ticket_id: string; status: string };
type Assignee = { assignee_user_id?: string | undefined; assignee_agent_id?: string | undefined };

/** Kiểm người / agent được gán; trả cột cập nhật. */
async function assigneeCols(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: Assignee) {
  if (!i.assignee_user_id === !i.assignee_agent_id) throw new AppError('VALIDATION_FAILED', 422, { assignee: 'one_only' });
  if (i.assignee_user_id) {
    await members.assertMember(ctx.workspaceId, i.assignee_user_id, 'assignee_user_id');
    return { assigneeUserId: i.assignee_user_id, assigneeAgentId: null };
  }
  const id = i.assignee_agent_id!;
  if (!UUID.test(id) || !(await tx.aiAgent.findUnique({ where: { id }, select: { id: true } }))) throw new AppError('VALIDATION_FAILED', 422, { assignee_agent_id: 'not_found' });
  return { assigneeUserId: null, assigneeAgentId: id };
}

const snapA = (t: TicketRecord) => ({ id: t.id, user: t.assigneeUserId, agent: t.assigneeAgentId, team: t.teamId, priority: t.priority });
type SnapA = ReturnType<typeof snapA>;

async function restoreA(tx: TenantTx, b: SnapA, now: Date) {
  await tx.ticket.updateMany({ where: { id: b.id }, data: { assigneeUserId: b.user, assigneeAgentId: b.agent, teamId: b.team, priority: b.priority as TicketRecord['priority'], updatedAt: now } });
}

@Injectable()
@ActionHandler('ticket.assign')
export class TicketAssignHandler implements Handler<ActionInput<typeof ticketAssign>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketAssign>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    if (t.status === 'closed') throw new AppError('INVALID_TRANSITION', 409, { status: t.status });
    const cols = await assigneeCols(ctx, tx, this.members, input);
    const row = await tx.ticket.update({ where: { id: t.id }, data: { ...cols, ...(input.team_id !== undefined ? { teamId: input.team_id || null } : {}), version: { increment: 1 }, updatedAt: now } });
    await logEvent(tx, t.id, 'assigned', await actorOf(ctx, tx, this.members), now, { user_id: row.assigneeUserId, agent_id: row.assigneeAgentId });
    return { result: { ticket_id: t.id, status: row.status }, before: snapA(t), events: [evOf('ticket.assigned', row, { by_user_id: actorUserId(ctx) })] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await restoreA(tx, log.before as SnapA, this.clock.now());
  }
}

@Injectable()
@ActionHandler('ticket.bulk_update')
export class TicketBulkUpdateHandler implements Handler<ActionInput<typeof ticketBulkUpdate>, { updated: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketBulkUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ updated: number }>> {
    const now = this.clock.now();
    const assign = input.assignee_user_id || input.assignee_agent_id;
    if (!assign && !input.priority) throw new AppError('VALIDATION_FAILED', 422, { change: 'required' });
    const cols = assign ? await assigneeCols(ctx, tx, this.members, input) : {};
    const actor = await actorOf(ctx, tx, this.members);
    const before: SnapA[] = [];
    const events: Ev[] = [];
    for (const id of [...new Set(input.ticket_ids)].sort()) {
      const t = await lockTicket(tx, ctx.authz, id);
      if (t.status === 'closed') continue;
      before.push(snapA(t));
      const row = await tx.ticket.update({ where: { id: t.id }, data: { ...cols, ...(input.priority ? { priority: input.priority } : {}), version: { increment: 1 }, updatedAt: now } });
      if (assign) {
        await logEvent(tx, t.id, 'assigned', actor, now, { user_id: row.assigneeUserId, agent_id: row.assigneeAgentId });
        events.push(evOf('ticket.assigned', row, { by_user_id: actorUserId(ctx) }));
      }
      if (input.priority && input.priority !== t.priority) await logEvent(tx, t.id, 'priority', actor, now, { priority: input.priority });
    }
    return { result: { updated: before.length }, before, events };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    for (const b of log.before as SnapA[]) await restoreA(tx, b, this.clock.now());
  }
}

@Injectable()
@ActionHandler('ticket.update')
export class TicketUpdateHandler implements Handler<ActionInput<typeof ticketUpdate>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    if (input.custom) {
      const errs = validateCustomValues(await fieldDefs(tx, 'ticket'), input.custom, ctx.authz.isOwner ? 'owner' : await this.members.roleOf(ctx.workspaceId, actorUserId(ctx)), 'update');
      if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
    }
    const row = await tx.ticket.update({
      where: { id: t.id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.category !== undefined ? { category: input.category.trim() } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.custom ? { custom: { ...(t.custom as object), ...input.custom } } : {}),
        version: { increment: 1 },
        updatedAt: now,
      },
    });
    if (input.priority && input.priority !== t.priority) await logEvent(tx, t.id, 'priority', await actorOf(ctx, tx, this.members), now, { priority: input.priority });
    return { result: { ticket_id: t.id, status: row.status }, before: { id: t.id, title: t.title, description: t.description, category: t.category, priority: t.priority, custom: t.custom } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; title: string; description: string; category: string; priority: TicketRecord['priority']; custom: object };
    await tx.ticket.updateMany({ where: { id: b.id }, data: { title: b.title, description: b.description, category: b.category, priority: b.priority, custom: b.custom, updatedAt: this.clock.now() } });
  }
}

@Injectable()
@ActionHandler('ticket.comment')
export class TicketCommentHandler implements Handler<ActionInput<typeof ticketComment>, { ticket_id: string; comment_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketComment>, tx: TenantTx): Promise<HandlerOutcome<{ ticket_id: string; comment_id: string }>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    if (t.status === 'closed' && !input.internal) throw new AppError('INVALID_TRANSITION', 409, { status: t.status });
    const actor = await actorOf(ctx, tx, this.members);
    const body = input.body.trim();
    // Trả lời khách khi ticket gắn hội thoại → gửi vào hội thoại (kênh lỗi / tạm dừng → 409, không ghi dở).
    let out: Outgoing | null = null;
    if (!input.internal && t.conversationId) {
      const conv = await tx.conversation.findUnique({ where: { id: t.conversationId } });
      if (conv && !conv.archivedAt) out = await writeOutgoing(tx, { conv, kind: 'text', body, sender: { type: actor.type === 'agent' ? 'agent' : actor.type === 'user' ? 'user' : 'system', id: actor.id, name: actor.name || null }, now });
    }
    const id = uuidv7(now.getTime());
    await tx.ticketComment.create({ data: { id, ticketId: t.id, authorType: actor.type, authorId: actor.id, authorName: actor.name, body, internal: input.internal, messageId: out?.messageId ?? null, createdAt: now } });
    const first = !input.internal && !t.firstResponseAt && actor.type !== 'system';
    await tx.ticket.update({ where: { id: t.id }, data: { ...(first ? { firstResponseAt: now } : {}), version: { increment: 1 }, updatedAt: now } });
    await logEvent(tx, t.id, input.internal ? 'note' : 'reply', actor, now);
    return {
      result: { ticket_id: t.id, comment_id: id },
      after: { id, first },
      ...(out ? { afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out!) } : {}),
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; first: boolean };
    const c = await tx.ticketComment.findUnique({ where: { id: a.id } });
    if (!c || c.deletedAt) return;
    // Tin đã gửi khách không thu hồi được qua hoàn tác.
    if (c.messageId) throw new AppError('UNDO_NOT_SUPPORTED', 409, { comment_id: 'sent' });
    await tx.ticketComment.update({ where: { id: a.id }, data: { deletedAt: this.clock.now() } });
    if (a.first) await tx.ticket.update({ where: { id: c.ticketId }, data: { firstResponseAt: null } });
  }
}
