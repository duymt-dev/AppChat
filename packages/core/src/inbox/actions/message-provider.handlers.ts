// message.recall · message.react (TIP-014b A — tách từ message.handlers.ts). Năng lực theo manifest (`operations.recall / react`):
// - `unsupported` → 409 trước mọi ghi; - `local` (kênh không có lệnh phía nhà cung cấp) → ghi trong AppChat như cũ, commit ngay;
// - `remote` (Zalo) → lệnh bền `channel_operation` + event cùng commit → 202 `job_accepted`; `recalled_at` / cảm xúc đã xác nhận chỉ đổi
//   khi có ACK nhà cung cấp (provider-result). Tham chiếu tin lấy ở server (`message_provider_ref`) — client không gửi id phía kênh.
// Cảm xúc remote: một tài khoản kênh = một danh tính cảm xúc; lần bấm = trạng thái cuối mong muốn (bật / tắt so với ý định hiện tại của
// tài khoản), revision tăng đơn điệu; cùng Idempotency-Key gửi lại → executor trả đúng handle (không bật / tắt lần hai).
import { Inject, Injectable } from '@nestjs/common';
import { operationMode, type ChannelRegistry, type OperationKind as Kind, type ReactionEmoji } from '@appchat/channels';
import { AppError } from '@appchat/shared';
import type { ActionInput, messageReact, messageRecall } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { CHANNEL_REGISTRY } from '../../channels/public';
import { liveRecall, nextReaction, operationStatusUrl, requestOperation } from '../../channels/operations/operation-service';
import { messageRefs } from '../../channels/operations/operation-store';
import { messageOf, scopeCols, writableConversation } from '../services/access';
import { me } from './kit';
import * as pv from './previews/message.handlers.preview';

type Conv = Awaited<ReturnType<typeof writableConversation>>;

async function msgEvent(tx: TenantTx, c: Conv, messageId: string, change: string) {
  return { topic: 'message.updated', payload: { ...(await scopeCols(tx, c)), message_id: messageId, change } };
}

function modeOf(registry: ChannelRegistry, c: Conv, kind: Kind) {
  const m = registry.get(c.channelType)?.manifest;
  // Kênh cũ chỉ khai `reactions: true` mà chưa khai operations → cảm xúc local (giữ hành vi trước 014b), không suy ra remote.
  if (kind === 'react' && !m?.capabilities.operations?.react && m?.capabilities.reactions) return 'local';
  return operationMode(m?.capabilities.operations, kind);
}

/** Tin ra đã có tham chiếu phía kênh mới gửi lệnh remote được — chưa gửi xong / tin cũ không có → 409, không gọi kênh. */
async function assertRemoteRefs(tx: TenantTx, messageId: string) {
  const refs = await messageRefs(tx, messageId);
  if (!refs.length) throw new AppError('INVALID_STATE', 409, { message_id: 'provider_ref_missing' });
  return refs;
}

@Injectable()
@ActionHandler('message.recall')
export class MessageRecallHandler implements Handler<ActionInput<typeof messageRecall>, { recalled: boolean }> {
  constructor(
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof messageRecall>, tx: TenantTx) {
    return pv.recallPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof messageRecall>, tx: TenantTx): Promise<HandlerOutcome<{ recalled: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const m = await messageOf(tx, c.id, input.message_id);
    // Chỉ tin của mình (REQ-C09) — Owner thu hồi được tin của nhân viên khác.
    if (m.direction !== 'out' || (m.senderId !== me(ctx) && !ctx.authz.isOwner)) throw new AppError('FORBIDDEN', 403, { message_id: 'not_own' });
    const mode = m.recalledAt ? 'local' : modeOf(this.registry, c, 'recall');
    if (mode === 'unsupported') {
      // Kênh không thu hồi được phía khách: giữ hành vi cũ (ẩn trong AppChat) — kênh khai rõ `recall: 'unsupported'` mới chặn.
      if (this.registry.get(c.channelType)?.manifest.capabilities.operations?.recall === 'unsupported') throw new AppError('INVALID_STATE', 409, { channel: 'recall_unsupported' });
    }
    if (mode !== 'remote') {
      if (!m.recalledAt) await tx.message.update({ where: { id: m.id }, data: { recalledAt: this.clock.now() } });
      return { result: { recalled: true }, events: [await msgEvent(tx, c, m.id, 'recalled')] };
    }
    const open = await liveRecall(tx, m.id);
    if (open) return { result: { recalled: open.status === 'confirmed' }, ...jobAccepted(open.id, operationStatusUrl(open.id)) };
    await assertRemoteRefs(tx, m.id);
    const op = await requestOperation(tx, { kind: 'recall', accountId: c.channelAccountId, conversationId: c.id, messageId: m.id, actorId: me(ctx), now: this.clock.now() });
    return { result: { recalled: false }, events: [op.event, await msgEvent(tx, c, m.id, 'operation')], ...jobAccepted(op.id, operationStatusUrl(op.id)) };
  }
}

@Injectable()
@ActionHandler('message.react')
export class MessageReactHandler implements Handler<ActionInput<typeof messageReact>, { emoji: string | null }> {
  constructor(
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof messageReact>, tx: TenantTx) {
    return pv.reactPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof messageReact>, tx: TenantTx): Promise<HandlerOutcome<{ emoji: string | null }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const mode = modeOf(this.registry, c, 'react');
    if (mode === 'unsupported') throw new AppError('INVALID_STATE', 409, { channel: 'reactions_unsupported' });
    const m = await messageOf(tx, c.id, input.message_id);
    const actorId = me(ctx) ?? ctx.actor.id;
    if (mode === 'local') return this.local(tx, c, m.id, actorId, input.emoji);
    if (m.deletedAt || m.recalledAt) throw new AppError('INVALID_STATE', 409, { message_id: 'removed' });
    await assertRemoteRefs(tx, m.id);
    // Ý định hiện tại của TÀI KHOẢN (không phải của riêng người bấm): cùng emoji → gỡ; khác → thay.
    const cur = await tx.messageAccountReaction.findUnique({ where: { messageId: m.id } });
    // Thẻ xem trước gắn revision lúc xem: tài khoản đã đổi cảm xúc từ đó → 409, xem trước lại (không tự tính lại bật / tắt).
    if (input.if_revision !== undefined && input.if_revision !== (cur?.desiredRevision ?? 0)) throw new AppError('CONFLICT', 409, { if_revision: 'stale' });
    const desired: ReactionEmoji | null = cur?.desiredEmoji === input.emoji ? null : input.emoji;
    const revision = await nextReaction(tx, c.channelAccountId, m.id, desired);
    // Hàng cảm xúc của người bấm = ý định đã gửi cho tài khoản (menu hiện đúng thứ mình chọn); trạng thái phía kênh là của tài khoản.
    await tx.messageReaction.deleteMany({ where: { messageId: m.id, actorType: 'user', actorId } });
    if (desired) await tx.messageReaction.create({ data: { messageId: m.id, actorType: 'user', actorId, emoji: desired, createdAt: this.clock.now() } });
    const op = await requestOperation(tx, { kind: 'react', accountId: c.channelAccountId, conversationId: c.id, messageId: m.id, actorId: me(ctx), desired: { emoji: desired }, revision, now: this.clock.now() });
    return { result: { emoji: desired }, events: [op.event, await msgEvent(tx, c, m.id, 'operation')], ...jobAccepted(op.id, operationStatusUrl(op.id)) };
  }

  /** Một cảm xúc / người trong AppChat: bấm lại cùng emoji = bỏ; emoji khác = thay. */
  private async local(tx: TenantTx, c: Conv, messageId: string, actorId: string, emoji: string): Promise<HandlerOutcome<{ emoji: string | null }>> {
    const mine = await tx.messageReaction.findMany({ where: { messageId, actorType: 'user', actorId } });
    await tx.messageReaction.deleteMany({ where: { messageId, actorType: 'user', actorId } });
    const same = mine.some((r) => r.emoji === emoji);
    if (!same) await tx.messageReaction.create({ data: { messageId, actorType: 'user', actorId, emoji, createdAt: this.clock.now() } });
    return { result: { emoji: same ? null : emoji }, events: [await msgEvent(tx, c, messageId, 'reaction')] };
  }
}
