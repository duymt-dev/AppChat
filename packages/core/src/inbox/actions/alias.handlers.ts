// Alias tường minh (TIP-025b §C.4): conversation.unhide · conversation.untag · message.unpin · message.unreact. Cùng luật ghi với action gốc
// qua services/conversation-mutations (không gọi lồng executor); gỡ = trạng thái mong muốn — chưa có thì không ghi, không bao giờ bật lại.
// message.unreact trên Zalo: ý định "không cảm xúc" có revision tăng đơn điệu (014b) → lệnh bền + 202; không phát lại toggle.
import { Inject, Injectable } from '@nestjs/common';
import { operationMode, type ChannelRegistry } from '@appchat/channels';
import { AppError } from '@appchat/shared';
import type { ActionInput, conversationUnhide, conversationUntag, messageUnpin, messageUnreact } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { CHANNEL_REGISTRY } from '../../channels/public';
import { nextReaction, operationStatusUrl, requestOperation } from '../../channels/operations/operation-service';
import { messageRefs } from '../../channels/operations/operation-store';
import { messageOf, scopeCols, writableConversation } from '../services/access';
import { removeTag, setHidden, unpinMessage } from '../services/conversation-mutations';
import { me, restore, tagNamesOf, type ConvSnap } from './kit';
import { convTitle } from './previews/conversation-state.handlers.preview';

@Injectable()
@ActionHandler('conversation.unhide')
export class ConversationUnhideHandler implements Handler<ActionInput<typeof conversationUnhide>, { hidden: false }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, i: ActionInput<typeof conversationUnhide>, tx: TenantTx) {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    return preview('write', line(await convTitle(tx, c)), { changes: updated('conversation', c.id, { hidden: !!c.hiddenAt }, { hidden: false }) });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof conversationUnhide>, tx: TenantTx): Promise<HandlerOutcome<{ hidden: false }>> {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const m = await setHidden(tx, c, false, this.clock.now());
    return { result: { hidden: false }, before: m.before, events: m.events };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await restore(tx, log.before as ConvSnap);
  }
}

@Injectable()
@ActionHandler('conversation.untag')
export class ConversationUntagHandler implements Handler<ActionInput<typeof conversationUntag>, { tags: string[] }> {
  async preview(ctx: ActionContext, i: ActionInput<typeof conversationUntag>, tx: TenantTx) {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const tags = await tagNamesOf(tx, c.id);
    const name = i.tag.trim();
    return preview('write', line(await convTitle(tx, c), name), { changes: updated('conversation', c.id, { tags }, { tags: tags.filter((x) => x.toLowerCase() !== name.toLowerCase()) }) });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof conversationUntag>, tx: TenantTx): Promise<HandlerOutcome<{ tags: string[] }>> {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const m = await removeTag(tx, c, i.tag);
    return { result: { tags: await tagNamesOf(tx, c.id) }, before: { id: c.id, tag_id: m.tagId, removed: m.changed }, events: m.events };
  }

  /** Gắn lại đúng thẻ đã gỡ (thẻ đã bị xoá sau đó → bỏ qua). */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; tag_id: string | null; removed: boolean };
    if (!b.removed || !b.tag_id || !(await tx.tag.findUnique({ where: { id: b.tag_id }, select: { id: true } }))) return;
    await tx.conversationTag.createMany({ data: [{ conversationId: b.id, tagId: b.tag_id }], skipDuplicates: true });
  }
}

@Injectable()
@ActionHandler('message.unpin')
export class MessageUnpinHandler implements Handler<ActionInput<typeof messageUnpin>, { pinned: false }> {
  async preview(ctx: ActionContext, i: ActionInput<typeof messageUnpin>, tx: TenantTx) {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const m = await messageOf(tx, c.id, i.message_id);
    return preview('write', line(await convTitle(tx, c)), { changes: updated('conversation', c.id, { pinned_message_id: c.pinnedMessageId }, { pinned_message_id: c.pinnedMessageId === m.id ? null : c.pinnedMessageId }) });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof messageUnpin>, tx: TenantTx): Promise<HandlerOutcome<{ pinned: false }>> {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const m = await messageOf(tx, c.id, i.message_id);
    return { result: { pinned: false }, events: (await unpinMessage(tx, c, m.id)).events };
  }
}

@Injectable()
@ActionHandler('message.unreact')
export class MessageUnreactHandler implements Handler<ActionInput<typeof messageUnreact>, { emoji: null }> {
  constructor(
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, i: ActionInput<typeof messageUnreact>, tx: TenantTx) {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const m = await messageOf(tx, c.id, i.message_id);
    return preview('write', line(await convTitle(tx, c)), { changes: [{ entity: 'message', id: m.id, after: { reaction: null } }] });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof messageUnreact>, tx: TenantTx): Promise<HandlerOutcome<{ emoji: null }>> {
    const c = await writableConversation(tx, ctx.authz, i.conversation_id);
    const m = await messageOf(tx, c.id, i.message_id);
    const actorId = me(ctx) ?? ctx.actor.id;
    const caps = this.registry.get(c.channelType)?.manifest.capabilities;
    const mode = !caps?.operations?.react && caps?.reactions ? 'local' : operationMode(caps?.operations, 'react');
    if (mode === 'unsupported') throw new AppError('INVALID_STATE', 409, { channel: 'reactions_unsupported' });
    const event = async () => ({ topic: 'message.updated', payload: { ...(await scopeCols(tx, c)), message_id: m.id, change: 'reaction' } });
    if (mode === 'local') {
      const n = await tx.messageReaction.deleteMany({ where: { messageId: m.id, actorType: 'user', actorId } });
      return { result: { emoji: null }, events: n.count ? [await event()] : [] };
    }
    // Remote: tài khoản không có ý định cảm xúc → không gửi lệnh (không bao giờ bật lại).
    const cur = await tx.messageAccountReaction.findUnique({ where: { messageId: m.id } });
    await tx.messageReaction.deleteMany({ where: { messageId: m.id, actorType: 'user', actorId } });
    if (!cur?.desiredEmoji) return { result: { emoji: null }, events: [] };
    if (!(await messageRefs(tx, m.id)).length) throw new AppError('INVALID_STATE', 409, { message_id: 'provider_ref_missing' });
    const revision = await nextReaction(tx, c.channelAccountId, m.id, null, this.clock.now());
    const op = await requestOperation(tx, { kind: 'react', accountId: c.channelAccountId, conversationId: c.id, messageId: m.id, actorId: me(ctx), desired: { emoji: null }, revision, now: this.clock.now() });
    return { result: { emoji: null }, events: [op.event, await event()], ...jobAccepted(op.id, operationStatusUrl(op.id)) };
  }
}
