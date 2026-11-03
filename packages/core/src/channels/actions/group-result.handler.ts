// channel.group_result (TIP-023b SPEC D): kết quả tạo nhóm từ worker giữ phiên. Chỉ nguồn `system` + actor `system:channels-group` — HTTP
// không gửi được nguồn system, Trợ lý / agent không thấy action này (permission self nhưng bị chặn ở đây, không chỉ tin input).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, channelGroupResult } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { applyGroupResult } from '../services/group-result';

type In = ActionInput<typeof channelGroupResult>;
type Out = { request_id: string; status: string; conversation_id: string | null };

export const GROUP_WORKER_ACTOR = 'channels-group';

@Injectable()
@ActionHandler('channel.group_result')
export class ChannelGroupResultHandler implements Handler<In, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  private guard(ctx: ActionContext) {
    if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== GROUP_WORKER_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    this.guard(ctx);
    const { row, changed, conversation } = await applyGroupResult(tx, input, this.clock.now());
    const events: { topic: string; payload: Record<string, unknown> }[] = [];
    if (changed) events.push({ topic: 'channel.group_result', payload: { request_id: row.id, channel_account_id: row.channelAccountId, requester_id: row.requesterId, status: row.status, conversation_id: row.conversationId } });
    if (conversation) events.push({ topic: 'conversation.updated', payload: { conversation_id: conversation.id, channel_account_id: conversation.channelAccountId, contact_id: null, assignee_user_id: null, contact_owner_user_id: null, change: 'group_created' } });
    return { result: { request_id: row.id, status: row.status, conversation_id: row.conversationId }, events };
  }

  /** Nguồn assistant không được nhận thẻ xác nhận cho callback hệ thống — chặn ngay ở bước preview. */
  async preview(ctx: ActionContext): Promise<never> {
    this.guard(ctx);
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }
}
