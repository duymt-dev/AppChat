// order.update · set_deposit · update_shipping (COMMERCE §4, §4b). Sửa tự do ở `new`; ở `processing` chỉ khi chưa thu khoản nào (đã thu
// → huỷ rồi tạo lại) — đổi dòng khi đã trừ kho thì hoàn kho lần cũ rồi trừ lại theo dòng mới. Đơn sàn (`locked_lines`): chỉ sửa người
// phụ trách / ghi chú / trường tuỳ biến. Vận chuyển nhập tay, sửa được cả sau khi hoàn tất. TIP-032c: CAS `if_version`, người tạo bất biến,
// người phụ trách `assigned_user_id`; hoàn tác chỉ trường đã đổi khi đơn chưa có bản ghi sau (editing/).
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, orderSetDeposit, orderUpdate, orderUpdateShipping } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CrmMembers } from '../../../crm/public';
import { depositPreview, shippingPreview, updatePreview } from '../previews/order-edit.handlers.preview';
import { editOrder, setOrderDeposit, updateOrderShipping } from '../editing/order-edit';
import { undoOrderEdit } from '../editing/order-undo';

type Out = { order_id: string; version: number };

@Injectable()
@ActionHandler('order.update')
export class OrderUpdateHandler implements Handler<ActionInput<typeof orderUpdate>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return editOrder(ctx, tx, this.members, input, this.clock.now());
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoOrderEdit(ctx, log, tx, 'order.update', this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderUpdate>, tx: TenantTx) {
    return updatePreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('order.set_deposit')
export class OrderSetDepositHandler implements Handler<ActionInput<typeof orderSetDeposit>, Out & { pay_status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderSetDeposit>, tx: TenantTx): Promise<HandlerOutcome<Out & { pay_status: string }>> {
    return setOrderDeposit(ctx, tx, input, this.clock.now());
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoOrderEdit(ctx, log, tx, 'order.set_deposit', this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderSetDeposit>, tx: TenantTx) {
    return depositPreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('order.update_shipping')
export class OrderShippingHandler implements Handler<ActionInput<typeof orderUpdateShipping>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof orderUpdateShipping>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return updateOrderShipping(ctx, tx, input, this.clock.now());
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoOrderEdit(ctx, log, tx, 'order.update_shipping', this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof orderUpdateShipping>, tx: TenantTx) {
    return shippingPreview(ctx, tx, input);
  }
}
