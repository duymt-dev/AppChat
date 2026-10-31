// order.sync_now (integrations.manage): kéo đơn ngay từ mọi kết nối sàn / POS (OrderSyncProvider, D31). Gọi sàn ở `prepare` (ngoài
// transaction — mỗi đơn một transaction riêng trong OrderSyncService); `execute` chỉ trả kết quả. Chưa có kết nối → 0 đơn.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, orderSyncNow } from '@appchat/actions';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { OrderSyncService } from '../services/order-sync';

type Out = { imported: number };

@Injectable()
@ActionHandler('order.sync_now')
export class OrderSyncNowHandler implements Handler<ActionInput<typeof orderSyncNow>, Out> {
  constructor(@Inject(OrderSyncService) private readonly sync: OrderSyncService | null) {}

  async prepare(ctx: ActionContext): Promise<Out> {
    if (!this.sync) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '031' }, 'order sync chưa cấu hình (APP_ENC_KEY)');
    const r = await this.sync.syncWorkspace(ctx.workspaceId);
    return { imported: r.imported };
  }

  async execute(_ctx: ActionContext, _input: ActionInput<typeof orderSyncNow>, _tx: unknown, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    return { result: prepared as Out };
  }
}
