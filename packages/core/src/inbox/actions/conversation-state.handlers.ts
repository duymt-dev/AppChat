// conversation.mark_read · set_status · pin · archive · hide · set_ai_mode · handoff · clear_history (Blueprint §3.4 inbox;
// REQ-C04, C10; D50). Scope inbox kiểm ở mỗi handler (SCOPE_FORBIDDEN); undo = khôi phục ảnh chụp cột trước khi đổi.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type {
  ActionInput,
  conversationArchive,
  conversationClearHistory,
  conversationHandoff,
  conversationHide,
  conversationMarkRead,
  conversationPin,
  conversationSetAiMode,
  conversationSetStatus,
} from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { writableConversation } from '../services/access';
import { bumpAiEpoch } from '../services/human-takeover';
import { fenceCustomerSource } from '../services/customer-source-fence';
import { readMentions } from '../services/mentions';
import { me, restore, snap, updatedEvent, type ConvSnap } from './kit';
import * as pv from './previews/conversation-state.handlers.preview';

const undoSnap = async (_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) => restore(tx, log.before as ConvSnap);

@Injectable()
@ActionHandler('conversation.mark_read')
export class ConversationMarkReadHandler implements Handler<ActionInput<typeof conversationMarkRead>, { unread_count: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationMarkRead>, tx: TenantTx) {
    return pv.markReadPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationMarkRead>, tx: TenantTx): Promise<HandlerOutcome<{ unread_count: number }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    // Lần @nhắc mình trong hội thoại → đã đọc (thư mục "Nhắc đến tôi" — TIP-025).
    const mentions = await readMentions(tx, c.id, me(ctx), this.clock.now());
    if (c.unreadCount === 0) return { result: { unread_count: 0 }, ...(mentions ? { events: [await updatedEvent(tx, c, 'read')] } : {}) };
    await tx.conversation.update({ where: { id: c.id }, data: { unreadCount: 0 } });
    return { result: { unread_count: 0 }, events: [await updatedEvent(tx, c, 'read')] };
  }
}

@Injectable()
@ActionHandler('conversation.set_status')
export class ConversationSetStatusHandler implements Handler<ActionInput<typeof conversationSetStatus>, { status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationSetStatus>, tx: TenantTx) {
    return pv.setStatusPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationSetStatus>, tx: TenantTx): Promise<HandlerOutcome<{ status: string }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    // Tạm ẩn bắt buộc thời hạn (Blueprint §3.4 ghi chú ver2.1: 1 giờ / 3 giờ / sáng mai / tuỳ chọn).
    if (input.status === 'snoozed' && !input.snooze_hours) throw new AppError('VALIDATION_FAILED', 422, { snooze_hours: 'required' });
    const until = input.status === 'snoozed' ? new Date(this.clock.now().getTime() + input.snooze_hours! * 3_600_000) : null;
    // Đóng hội thoại: lượt agent đang chạy mất quyền gửi (TIP-045b annex D).
    if (input.status === 'closed') await bumpAiEpoch(tx, c.id);
    await tx.conversation.update({ where: { id: c.id }, data: { status: input.status, snoozedUntil: until } });
    return { result: { status: input.status }, before: snap(c, ['status', 'snoozedUntil']), events: [await updatedEvent(tx, c, 'status')] };
  }

  undo = undoSnap;
}

@Injectable()
@ActionHandler('conversation.pin')
export class ConversationPinHandler implements Handler<ActionInput<typeof conversationPin>, { pinned: boolean }> {
  async preview(ctx: ActionContext, input: ActionInput<typeof conversationPin>, tx: TenantTx) {
    return pv.pinPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationPin>, tx: TenantTx): Promise<HandlerOutcome<{ pinned: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    await tx.conversation.update({ where: { id: c.id }, data: { pinned: input.pinned } });
    return { result: { pinned: input.pinned }, events: [await updatedEvent(tx, c, 'pin')] };
  }
}

@Injectable()
@ActionHandler('conversation.archive')
export class ConversationArchiveHandler implements Handler<ActionInput<typeof conversationArchive>, { archived: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationArchive>, tx: TenantTx) {
    return pv.archivePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationArchive>, tx: TenantTx): Promise<HandlerOutcome<{ archived: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    await bumpAiEpoch(tx, c.id);
    await tx.conversation.update({ where: { id: c.id }, data: { archivedAt: c.archivedAt ?? this.clock.now() } });
    return { result: { archived: true }, before: snap(c, ['archivedAt']), events: [await updatedEvent(tx, c, 'archive')] };
  }

  undo = undoSnap;
}

@Injectable()
@ActionHandler('conversation.hide')
export class ConversationHideHandler implements Handler<ActionInput<typeof conversationHide>, { hidden: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationHide>, tx: TenantTx) {
    return pv.hidePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationHide>, tx: TenantTx): Promise<HandlerOutcome<{ hidden: boolean }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    await tx.conversation.update({ where: { id: c.id }, data: { hiddenAt: input.hidden ? (c.hiddenAt ?? this.clock.now()) : null } });
    return { result: { hidden: input.hidden }, before: snap(c, ['hiddenAt']), events: [await updatedEvent(tx, c, 'hide')] };
  }

  undo = undoSnap;
}

@Injectable()
@ActionHandler('conversation.set_ai_mode')
export class ConversationSetAiModeHandler implements Handler<ActionInput<typeof conversationSetAiMode>, { ai_mode: string }> {
  async preview(ctx: ActionContext, input: ActionInput<typeof conversationSetAiMode>, tx: TenantTx) {
    return pv.setAiModePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationSetAiMode>, tx: TenantTx): Promise<HandlerOutcome<{ ai_mode: string }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    // Tắt AI giữa chừng: AI đang chạy / chờ duyệt dừng lại (TIP-022 huỷ run theo event).
    const aiState = input.ai_mode === 'off' && c.aiState === 'running' ? 'idle' : c.aiState;
    // Đổi chế độ thủ công: lượt agent cũ không gửi theo chế độ cũ (TIP-045b annex D).
    if (input.ai_mode !== c.aiMode) await bumpAiEpoch(tx, c.id);
    await tx.conversation.update({ where: { id: c.id }, data: { aiMode: input.ai_mode, aiState } });
    return { result: { ai_mode: input.ai_mode }, before: snap(c, ['aiMode', 'aiState']), events: [await updatedEvent(tx, c, 'ai_mode')] };
  }

  undo = undoSnap;
}

@Injectable()
@ActionHandler('conversation.handoff')
export class ConversationHandoffHandler implements Handler<ActionInput<typeof conversationHandoff>, { ai_state: string }> {
  async preview(ctx: ActionContext, input: ActionInput<typeof conversationHandoff>, tx: TenantTx) {
    return pv.handoffPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationHandoff>, tx: TenantTx): Promise<HandlerOutcome<{ ai_state: string }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    // Người nhận lại hội thoại AI đã chuyển: gán cho mình, AI chuyển sang gợi ý (không tự gửi nữa).
    const user = me(ctx);
    await bumpAiEpoch(tx, c.id);
    await tx.conversation.update({
      where: { id: c.id },
      data: { aiState: 'idle', handoffReason: null, assigneeUserId: user ?? c.assigneeUserId, aiMode: c.aiMode === 'auto' ? 'copilot' : c.aiMode },
    });
    return { result: { ai_state: 'idle' }, events: [await updatedEvent(tx, { ...c, assigneeUserId: user ?? c.assigneeUserId }, 'handoff')] };
  }
}

@Injectable()
@ActionHandler('conversation.clear_history')
export class ConversationClearHistoryHandler implements Handler<ActionInput<typeof conversationClearHistory>, { cleared: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationClearHistory>, tx: TenantTx) {
    return pv.clearHistoryPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationClearHistory>, tx: TenantTx): Promise<HandlerOutcome<{ cleared: number }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    // Chỉ ẩn trong AppChat (mốc `cleared_at`) — lịch sử phía kênh giữ nguyên; undo = trả mốc cũ.
    // Mốc ≥ tin mới nhất (giờ tin vào là giờ phía kênh — có thể lệch đồng hồ máy chủ).
    const last = await tx.message.findFirst({ where: { conversationId: c.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    const now = this.clock.now();
    const mark = last && last.createdAt > now ? last.createdAt : now;
    const cleared = await tx.message.count({ where: { conversationId: c.id, ...(c.clearedAt ? { createdAt: { gt: c.clearedAt } } : {}) } });
    await fenceCustomerSource(tx, c.id, null, 'history_cleared', now);
    await tx.conversation.update({ where: { id: c.id }, data: { clearedAt: mark, pinnedMessageId: null } });
    return { result: { cleared }, before: snap(c, ['clearedAt', 'pinnedMessageId']), events: [await updatedEvent(tx, c, 'cleared')] };
  }

  undo = undoSnap;
}
