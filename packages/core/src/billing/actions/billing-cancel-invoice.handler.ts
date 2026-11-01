// billing.cancel_invoice (db platform, billing.manage) — huỷ hoá đơn còn chờ; đã trả / hết hạn / đã huỷ → 409 (TIP-010).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, billingCancelInvoice } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { UUID_V7 } from '../../kernel/ids';
import { InvoicesService } from '../payments/invoices.service';

type Input = ActionInput<typeof billingCancelInvoice>;

@Injectable()
@ActionHandler('billing.cancel_invoice')
export class BillingCancelInvoiceHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService | null) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx || !this.invoices) throw new AppError('INTERNAL', 500, undefined, 'billing.cancel_invoice cần PlatformTx + InvoicesService');
    if (!UUID_V7.test(input.invoice_id)) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    const inv = await this.invoices.cancel(ptx, ctx.workspaceId, input.invoice_id);
    return { result: { ok: true }, before: { invoice_id: inv.id, status: inv.status }, after: { invoice_id: inv.id, status: 'cancelled' } };
  }
}
