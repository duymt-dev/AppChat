// message.send · forward · recall · delete · react · pin · note.add (Blueprint §3.4 inbox; REQ-C09, C13). Gửi đi qua outbox
// (`writeOutgoing` trong transaction → `afterCommit` đẩy hàng đợi gửi của tài khoản). Cảm xúc chỉ kênh `capabilities.reactions`.
// Thu hồi / cảm xúc ghi trong AppChat; gọi API kênh tương ứng là việc của adapter sau này (Q-014).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ChannelRegistry } from '@appchat/channels';
import { AppError } from '@appchat/shared';
import type { ActionInput, messageDelete, messageForward, messagePin, messageReact, messageRecall, messageSend, noteAdd } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { CHANNEL_REGISTRY, ChannelSendQueue } from '../../channels/public';
import { CrmMembers } from '../../crm/public';
import { UUID, messageOf, scopeCols, writableConversation } from '../services/access';
import { resolveAttachments, sendKindOf, type FileLinks } from '../services/attachments';
import { recordMentions } from '../services/mentions';
import { FILE_LINKS } from '../tokens';
import { enqueueOutgoing, writeOutgoing } from '../services/outbound';
import { me, updatedEvent } from './kit';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;
const SEND_KINDS = new Set(['text', 'image', 'file', 'sticker', 'audio', 'card']);

async function msgEvent(tx: TenantTx, c: Conv, messageId: string, change: string) {
  return { topic: 'message.updated', payload: { ...(await scopeCols(tx, c)), message_id: messageId, change } };
}

/** Tên người gửi hiện trên tin ra ("Người gửi: <tên> (bạn)" — REQ-C13). */
export async function senderOf(ctx: ActionContext, members: CrmMembers, tx?: Pick<TenantTx, 'aiAgent'>) {
  const id = me(ctx);
  if (ctx.actor.type === 'agent') {
    // Tên agent hiện trên tin ("Agent CSKH") — TIP-022.
    const a = tx && UUID.test(ctx.actor.id) ? await tx.aiAgent.findUnique({ where: { id: ctx.actor.id }, select: { name: true } }) : null;
    return { type: 'agent' as const, id: ctx.actor.id, name: a?.name ?? null };
  }
  const name = id ? ((await members.names([id])).get(id) ?? null) : null;
  return { type: 'user' as const, id, name };
}

@Injectable()
@ActionHandler('message.send')
export class MessageSendHandler implements Handler<ActionInput<typeof messageSend>, { message_id: string }> {
  constructor(
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Optional() @Inject(FILE_LINKS) private readonly links: FileLinks | null,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof messageSend>, tx: TenantTx): Promise<HandlerOutcome<{ message_id: string }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    // Tệp đính kèm (TIP-025): kiểm kênh hỗ trợ trước khi đổi tệp thành link ký.
    const ids = input.attachments ?? [];
    if (ids.length) sendKindOf(this.registry, c.channelType, [{ mime: 'application/octet-stream' }]);
    const files = await resolveAttachments(tx, ctx, this.links ?? null, ids);
    const out = await writeOutgoing(tx, {
      conv: c,
      kind: files.length ? sendKindOf(this.registry, c.channelType, files) : 'text',
      body: (input.text ?? '').trim(),
      ...(files.length ? { attachments: files } : {}),
      sender: await senderOf(ctx, this.members, tx),
      replyToId: input.reply_to_id ?? null,
      now: this.clock.now(),
    });
    const cols = await scopeCols(tx, c);
    return {
      result: { message_id: out.messageId },
      events: [{ topic: 'message.updated', payload: { ...cols, message_id: out.messageId, change: 'status' } }],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out),
    };
  }
}

@Injectable()
@ActionHandler('message.forward')
export class MessageForwardHandler implements Handler<ActionInput<typeof messageForward>, { message_id: string }> {
  constructor(
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof messageForward>, tx: TenantTx): Promise<HandlerOutcome<{ message_id: string }>> {
    const src = await writableConversation(tx, ctx.authz, input.conversation_id);
    const m = await messageOf(tx, src.id, input.message_id);
    if (m.deletedAt || m.recalledAt || !SEND_KINDS.has(m.kind)) throw new AppError('INVALID_STATE', 409, { message_id: 'not_forwardable' });
    const target = await writableConversation(tx, ctx.authz, input.target_conversation_id);
    const att = Array.isArray(m.attachments) ? (m.attachments as { url: string; mime: string; name?: string }[]) : [];
    const out = await writeOutgoing(tx, { conv: target, kind: m.kind as 'text', body: m.body, attachments: att, sender: await senderOf(ctx, this.members), forwardedFromId: m.id, now: this.clock.now() });
    return {
      result: { message_id: out.messageId },
      events: [await msgEvent(tx, target, out.messageId, 'status')],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out),
    };
  }
}

@Injectable()
@ActionHandler('message.recall')
export class MessageRecallHandler implements Handler<ActionInput<typeof messageRecall>, { recalled: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof messageRecall>, tx: TenantTx): Promise<HandlerOutcome<{ recalled: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const m = await messageOf(tx, c.id, input.message_id);
    // Chỉ tin của mình (REQ-C09) — Owner thu hồi được tin của nhân viên khác.
    if (m.direction !== 'out' || (m.senderId !== me(ctx) && !ctx.authz.isOwner)) throw new AppError('FORBIDDEN', 403, { message_id: 'not_own' });
    if (!m.recalledAt) await tx.message.update({ where: { id: m.id }, data: { recalledAt: this.clock.now() } });
    return { result: { recalled: true }, events: [await msgEvent(tx, c, m.id, 'recalled')] };
  }
}

@Injectable()
@ActionHandler('message.delete')
export class MessageDeleteHandler implements Handler<ActionInput<typeof messageDelete>, { deleted: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof messageDelete>, tx: TenantTx): Promise<HandlerOutcome<{ deleted: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const m = await messageOf(tx, c.id, input.message_id);
    await tx.message.update({ where: { id: m.id }, data: { deletedAt: m.deletedAt ?? this.clock.now() } });
    if (c.pinnedMessageId === m.id) await tx.conversation.update({ where: { id: c.id }, data: { pinnedMessageId: null } });
    return {
      result: { deleted: true },
      before: { conversation_id: c.id, message_id: m.id, deleted_at: m.deletedAt?.toISOString() ?? null, pinned: c.pinnedMessageId === m.id },
      events: [await msgEvent(tx, c, m.id, 'deleted')],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { conversation_id: string; message_id: string; deleted_at: string | null; pinned: boolean };
    await tx.message.updateMany({ where: { id: b.message_id }, data: { deletedAt: b.deleted_at ? new Date(b.deleted_at) : null } });
    if (b.pinned) await tx.conversation.updateMany({ where: { id: b.conversation_id }, data: { pinnedMessageId: b.message_id } });
  }
}

@Injectable()
@ActionHandler('message.react')
export class MessageReactHandler implements Handler<ActionInput<typeof messageReact>, { emoji: string | null }> {
  constructor(
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof messageReact>, tx: TenantTx): Promise<HandlerOutcome<{ emoji: string | null }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    if (!this.registry.get(c.channelType)?.manifest.capabilities.reactions) throw new AppError('INVALID_STATE', 409, { channel: 'reactions_unsupported' });
    const m = await messageOf(tx, c.id, input.message_id);
    const actorId = me(ctx) ?? ctx.actor.id;
    const mine = await tx.messageReaction.findMany({ where: { messageId: m.id, actorType: 'user', actorId } });
    // Một cảm xúc / người: bấm lại cùng emoji = bỏ; emoji khác = thay.
    await tx.messageReaction.deleteMany({ where: { messageId: m.id, actorType: 'user', actorId } });
    const same = mine.some((r) => r.emoji === input.emoji);
    if (!same) await tx.messageReaction.create({ data: { messageId: m.id, actorType: 'user', actorId, emoji: input.emoji, createdAt: this.clock.now() } });
    return { result: { emoji: same ? null : input.emoji }, events: [await msgEvent(tx, c, m.id, 'reaction')] };
  }
}

@Injectable()
@ActionHandler('message.pin')
export class MessagePinHandler implements Handler<ActionInput<typeof messagePin>, { pinned: boolean }> {
  async execute(ctx: ActionContext, input: ActionInput<typeof messagePin>, tx: TenantTx): Promise<HandlerOutcome<{ pinned: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const m = await messageOf(tx, c.id, input.message_id);
    if (input.pinned && (m.deletedAt || m.recalledAt)) throw new AppError('INVALID_STATE', 409, { message_id: 'removed' });
    const next = input.pinned ? m.id : c.pinnedMessageId === m.id ? null : c.pinnedMessageId;
    await tx.conversation.update({ where: { id: c.id }, data: { pinnedMessageId: next } });
    return { result: { pinned: input.pinned }, events: [await updatedEvent(tx, c, 'pin_message')] };
  }
}

@Injectable()
@ActionHandler('note.add')
export class NoteAddHandler implements Handler<ActionInput<typeof noteAdd>, { message_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof noteAdd>, tx: TenantTx): Promise<HandlerOutcome<{ message_id: string }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    const s = await senderOf(ctx, this.members);
    // Ghi chú nội bộ: không có direction, không gửi kênh, không đổi preview danh sách.
    await tx.message.create({ data: { id, conversationId: c.id, channelAccountId: c.channelAccountId, senderType: s.type, senderId: s.id, senderName: s.name, kind: 'note', body: input.text, status: 'sent', createdAt: now } });
    // @nhắc thành viên (TIP-025) → thư mục "Nhắc đến tôi" + thông báo msg_mention.
    const m = await recordMentions(tx, this.members, { workspaceId: ctx.workspaceId, conv: c, messageId: id, by: s, userIds: input.mentions ?? [], now });
    const events = [await msgEvent(tx, c, id, 'status'), ...(m.userIds.length ? [await updatedEvent(tx, c, 'mention')] : []), ...m.events];
    return { result: { message_id: id }, after: { id }, events };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await tx.message.deleteMany({ where: { id: (log.after as { id: string }).id, kind: 'note' } });
  }
}
