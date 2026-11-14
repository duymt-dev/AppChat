// ticket.assign · comment · update (Blueprint §3.4 support, REQ-H01 / H03). Phụ trách = một người (thành viên active) HOẶC một agent
// (tồn tại, chưa xoá) — ghi qua support/bulk/mutations.ts dùng chung với sửa hàng loạt (TIP-034c). Bình luận: ghi chú nội bộ hoặc trả lời
// khách — trả lời đầu tiên của người / agent chốt phản hồi đầu (dừng đồng hồ FRT); ticket gắn hội thoại thì trả lời gửi luôn vào hội thoại
// đó. Sửa: tiêu đề / mô tả / danh mục / ưu tiên / trường tuỳ biến. Đã đóng → chỉ bình luận nội bộ. Hoàn tác 24 giờ, có canh gác (TIP-034c
// §2.3): chỉ khi ticket còn đúng version sau ghi — có ai sửa sau đó → 409 CONFLICT; log cũ không có version sau ghi → 409 (không đoán).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, validateCustomValues } from '@appchat/shared';
import type { ActionInput, ticketAssign, ticketComment, ticketUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, actorUserId, fieldDefs } from '../../crm/public';
import { enqueueOutgoing, writeOutgoing, type Outgoing } from '../../inbox/public';
import { assertIfVersion } from '../../kernel/actions/cas';
import { lockTicket, type TicketRecord } from '../ticket-access';
import { actorOf, logEvent } from '../services/ticket-write';
import { applyTicketPatch, recipientCols, revertTicketPatch, type TicketReceipt } from '../bulk/mutations';
import * as pv from './previews/ticket-edit.handlers.preview';

type Out = { ticket_id: string; status: string };

/** Log gán (từ TIP-034c): biên nhận trường đã đổi + version sau ghi + nhóm trước nếu đổi. Log cũ (bản chụp không version) không có. */
type GuardedLog = { receipt: TicketReceipt | null; after_version: number; team_before?: string | null; team_touched?: boolean };

/** Hoàn tác gán có canh gác: log cũ thiếu bằng chứng → 409, ticket bị sửa sau đó → 409; khôi phục chỉ trường đã đổi. */
async function guardedRevert(ctx: ActionContext, tx: TenantTx, members: CrmMembers, before: unknown, now: Date, id: string) {
  const b = (before ?? {}) as Partial<GuardedLog>;
  if (typeof b.after_version !== 'number') throw new AppError('CONFLICT', 409, { undo: 'legacy_log' });
  const t = await lockTicket(tx, ctx.authz, id);
  const receipt = b.receipt ?? { fields: [], before: {}, after: {}, fingerprint: '' };
  const restore = (prev: { user: string | null; agent: string | null }) => recipientCols(ctx.workspaceId, tx, members, prev.user ? { kind: 'user', id: prev.user } : { kind: 'agent', id: prev.agent! });
  await revertTicketPatch(tx, t, { receipt, afterVersion: b.after_version, teamBefore: b.team_before ?? null, teamTouched: !!b.team_touched }, restore, now);
}

@Injectable()
@ActionHandler('ticket.assign')
export class TicketAssignHandler implements Handler<ActionInput<typeof ticketAssign>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof ticketAssign>, tx: TenantTx) {
    return pv.assignPreview(tx, ctx.authz, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketAssign>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    if (!input.assignee_user_id === !input.assignee_agent_id) throw new AppError('VALIDATION_FAILED', 422, { assignee: 'one_only' });
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    assertIfVersion(t.version, input.if_version);
    if (t.status === 'closed') throw new AppError('INVALID_TRANSITION', 409, { status: t.status });
    const cols = await recipientCols(ctx.workspaceId, tx, this.members, input.assignee_user_id ? { kind: 'user', id: input.assignee_user_id } : { kind: 'agent', id: input.assignee_agent_id! });
    const team = input.team_id !== undefined ? { teamId: input.team_id || null } : undefined;
    const r = await applyTicketPatch(ctx, tx, t, { cols, ...(team ? { team } : {}) }, await actorOf(ctx, tx, this.members), now);
    const before: GuardedLog = { receipt: r.receipt, after_version: r.row.version, ...(team && team.teamId !== t.teamId ? { team_before: t.teamId, team_touched: true } : {}) };
    return { result: { ticket_id: t.id, status: r.row.status }, before, events: r.events, ...(r.changed ? {} : { noUndo: true }) };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await guardedRevert(ctx, tx, this.members, log.before, this.clock.now(), (log.input as { ticket_id: string }).ticket_id);
  }
}

@Injectable()
@ActionHandler('ticket.update')
export class TicketUpdateHandler implements Handler<ActionInput<typeof ticketUpdate>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof ticketUpdate>, tx: TenantTx) {
    return pv.updatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    assertIfVersion(t.version, input.if_version);
    if (input.custom) {
      const errs = validateCustomValues(await fieldDefs(tx, 'ticket'), input.custom, ctx.authz.isOwner ? 'owner' : await this.members.roleOf(ctx.workspaceId, actorUserId(ctx)), 'update');
      if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
    }
    const text = {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category.trim() } : {}),
      ...(input.custom ? { custom: { ...(t.custom as object), ...input.custom } } : {}),
    };
    // Ưu tiên qua helper chung (lịch sử + event); trường chữ / tuỳ biến cùng transaction. Version do trigger tăng ở mỗi UPDATE.
    const p = await applyTicketPatch(ctx, tx, t, { cols: null, priority: input.priority }, await actorOf(ctx, tx, this.members), now);
    const row = Object.keys(text).length ? await tx.ticket.update({ where: { id: t.id }, data: { ...text, updatedAt: now } }) : p.row;
    const fields = [...Object.keys(text), ...(p.changed ? ['priority'] : [])];
    const before = { id: t.id, title: t.title, description: t.description, category: t.category, priority: t.priority, custom: t.custom, fields, after_version: row.version };
    return { result: { ticket_id: t.id, status: row.status }, before, events: p.events, ...(fields.length ? {} : { noUndo: true }) };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; title: string; description: string; category: string; priority: TicketRecord['priority']; custom: object; fields?: string[]; after_version?: number };
    if (typeof b.after_version !== 'number' || !b.fields) throw new AppError('CONFLICT', 409, { undo: 'legacy_log' });
    const t = await lockTicket(tx, ctx.authz, b.id);
    // Có người / hệ thống sửa sau lần này (kể cả ABA) → không ghi đè.
    if (t.version !== b.after_version) throw new AppError('CONFLICT', 409, { ticket_id: 'changed' });
    const f = new Set(b.fields);
    const data = {
      ...(f.has('title') ? { title: b.title } : {}),
      ...(f.has('description') ? { description: b.description } : {}),
      ...(f.has('category') ? { category: b.category } : {}),
      ...(f.has('priority') ? { priority: b.priority } : {}),
      ...(f.has('custom') ? { custom: b.custom } : {}),
    };
    if (Object.keys(data).length) await tx.ticket.update({ where: { id: t.id }, data: { ...data, updatedAt: this.clock.now() } });
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

  async preview(ctx: ActionContext, input: ActionInput<typeof ticketComment>, tx: TenantTx) {
    return pv.commentPreview(tx, ctx.authz, input);
  }

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
    await tx.ticket.update({ where: { id: t.id }, data: { ...(first ? { firstResponseAt: now } : {}), updatedAt: now } });
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
