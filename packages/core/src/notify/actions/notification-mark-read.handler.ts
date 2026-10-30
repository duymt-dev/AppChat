// notification.mark_read — đánh dấu đã đọc thông báo của CHÍNH người gọi (permission 'self'). Handler mẫu của kernel (TIP-003);
// đọc / gửi thông báo (WS, email) ở TIP-006.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput } from '@appchat/actions';
import type { notificationMarkRead } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

type Input = ActionInput<typeof notificationMarkRead>;

@Injectable()
@ActionHandler('notification.mark_read')
export class NotificationMarkReadHandler implements Handler<Input, { updated: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Input, tx: TenantTx): Promise<HandlerOutcome<{ updated: number }>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const r = await tx.notification.updateMany({
      where: { userId, readAt: null, ...(input.ids === 'all' ? {} : { id: { in: input.ids } }) },
      data: { readAt: this.clock.now() },
    });
    return { result: { updated: r.count }, after: { ids: input.ids, updated: r.count } };
  }
}
