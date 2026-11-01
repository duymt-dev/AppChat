// admin.invoice.confirm_transfer (db platform, platform_admin, money) — duyệt chuyển khoản thủ công (REQ-L04): hoá đơn còn chờ
// (pending / pending_review / expired) → paid (method bank_transfer, confirmed_by) rồi ghi nhận (kích hoạt gói / cộng credit) SAU
// commit (`afterCommit`). Hoá đơn thuộc workspace bất kỳ; action_log nằm ở workspace admin đang đứng (DC-054). Đã paid / huỷ → 409.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminInvoiceConfirmTransfer } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { InvoiceFulfiller } from '../payments/fulfil';

type Input = ActionInput<typeof adminInvoiceConfirmTransfer>;
type Output = { invoice_id: string; status: 'paid' };

@Injectable()
@ActionHandler('admin.invoice.confirm_transfer')
export class AdminConfirmTransferHandler implements Handler<Input, Output> {
  constructor(@Inject(InvoiceFulfiller) private readonly fulfiller: InvoiceFulfiller | null) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx || !this.fulfiller) throw new AppError('INTERNAL', 500, undefined, 'admin.invoice.confirm_transfer cần PlatformTx + InvoiceFulfiller');
    const inv = await ptx.billingInvoice.findUnique({ where: { id: input.invoice_id } });
    if (!inv) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    if (!(await this.fulfiller.markPaid(ptx, inv.id, { method: 'bank_transfer', confirmedBy: ctx.actor.id }))) throw new AppError('CONFLICT', 409, { status: inv.status });
    const fulfiller = this.fulfiller;
    return {
      // Ghi nhận cần transaction riêng của ví / subscription → sau commit; lỗi / tiến trình chết giữa chừng → scheduler quét hoá
      // đơn paid chưa ghi nhận (DC-055).
      afterCommit: async () => void (await fulfiller.fulfil(inv.id)),
      result: { invoice_id: inv.id, status: 'paid' },
      before: { invoice_id: inv.id, workspace_id: inv.workspaceId, status: inv.status },
      after: { invoice_id: inv.id, workspace_id: inv.workspaceId, status: 'paid', note: input.note ?? null },
    };
  }
}
