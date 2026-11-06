// channel_operation.cancel (TIP-014b B, inbox.reply, không cho agent): huỷ lệnh thu hồi / cảm xúc còn `queued` (chưa đặt chỗ gọi kênh).
// Chỉ lệnh trên tin gắn hội thoại người ra lệnh còn sửa được, do chính người đó tạo (Owner huỷ được của người khác); lệnh khác loại
// (lịch sử / thăm dò / đồng bộ) → 404 như không tồn tại. Đã `dispatch_reserved` → 409: không hứa thu hồi được lệnh đã gửi. Ghi có điều
// kiện `status = queued` — worker giành lệnh cùng lúc thì một bên thắng, không ghi đè.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, channelOperationCancel } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { scopeCols, writableConversation } from '../../inbox/services/access';
import { convTitle } from '../../inbox/actions/previews/conversation-state.handlers.preview';
import { me } from '../../inbox/actions/kit';

type Input = ActionInput<typeof channelOperationCancel>;
type Out = { operation_id: string; state: string };

async function cancellable(ctx: ActionContext, tx: TenantTx, id: string) {
  const op = await tx.channelOperation.findUnique({ where: { id } });
  if (!op || (op.kind !== 'recall' && op.kind !== 'react')) throw new AppError('NOT_FOUND', 404, { operation_id: 'not_found' });
  const c = await writableConversation(tx, ctx.authz, op.conversationId);
  if (op.actorId !== me(ctx) && !ctx.authz.isOwner) throw new AppError('FORBIDDEN', 403, { operation_id: 'not_own' });
  return { op, c };
}

@Injectable()
@ActionHandler('channel_operation.cancel')
export class ChannelOperationCancelHandler implements Handler<Input, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, i: Input, tx: TenantTx): Promise<ActionPreview> {
    const { op, c } = await cancellable(ctx, tx, i.operation_id);
    return preview('write', line(await convTitle(tx, c), op.kind), { changes: updated('channel_operation', op.id, { status: op.status }, { status: 'cancelled' }) });
  }

  async execute(ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { op, c } = await cancellable(ctx, tx, i.operation_id);
    if (op.status === 'cancelled') return { result: { operation_id: op.id, state: 'cancelled' } };
    const n = await tx.channelOperation.updateMany({ where: { id: op.id, status: 'queued' }, data: { status: 'cancelled', finishedAt: this.clock.now() } });
    if (!n.count) throw new AppError('INVALID_STATE', 409, { operation_id: op.status === 'queued' ? 'dispatch_reserved' : op.status });
    // Huỷ cảm xúc: ý định tài khoản quay về bản đã xác nhận (revision vẫn tăng — ACK trễ của lệnh này không đè).
    if (op.kind === 'react') {
      await tx.$executeRaw`UPDATE message_account_reaction SET desired_emoji = confirmed_emoji, desired_revision = desired_revision + 1, updated_at = now()
        WHERE message_id = ${op.messageId}::uuid AND desired_revision = ${op.revision}`;
    }
    return { result: { operation_id: op.id, state: 'cancelled' }, events: [{ topic: 'message.updated', payload: { ...(await scopeCols(tx, c)), message_id: op.messageId, change: 'operation' } }] };
  }
}
