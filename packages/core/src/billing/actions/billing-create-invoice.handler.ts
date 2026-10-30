// billing.create_invoice (db platform, billing.manage, risk money → Idempotency-Key) — mua gói / gói credit / tài nguyên: hoá đơn
// + VietQR động 15 phút (TIP-010). Trả `qr_info` (ngân hàng, STK, nội dung) cho hộp thanh toán ngoài output chuẩn.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, billingCreateInvoice } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { InvoicesService } from '../payments/invoices.service';

type Input = ActionInput<typeof billingCreateInvoice>;
type Output = { invoice_id: string; amount: string; transfer_code: string; qr: string };

@Injectable()
@ActionHandler('billing.create_invoice')
export class BillingCreateInvoiceHandler implements Handler<Input, Output> {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService | null) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx || !this.invoices) throw new AppError('INTERNAL', 500, undefined, 'billing.create_invoice cần PlatformTx + InvoicesService');
    const inv = await this.invoices.create(ptx, ctx.workspaceId, ctx.actor.id, input);
    return {
      result: { invoice_id: inv.id, amount: String(inv.amount), transfer_code: inv.transferCode, qr: inv.qrPayload },
      after: { invoice_id: inv.id, code: inv.code, kind: inv.kind, item: inv.item, amount: String(inv.amount) },
    };
  }
}
