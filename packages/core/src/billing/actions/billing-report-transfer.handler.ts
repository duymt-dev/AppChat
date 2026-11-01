// billing.report_transfer (db platform, billing.manage) — "Tôi đã chuyển khoản": pending → pending_review (webhook / admin đối
// soát sau); đã paid → giữ (TIP-010, REQ-L04).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, billingReportTransfer } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { UUID_V7 } from '../../kernel/ids';
import { InvoicesService } from '../payments/invoices.service';

type Input = ActionInput<typeof billingReportTransfer>;
type Output = { invoice_id: string; status: string };

@Injectable()
@ActionHandler('billing.report_transfer')
export class BillingReportTransferHandler implements Handler<Input, Output> {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService | null) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx || !this.invoices) throw new AppError('INTERNAL', 500, undefined, 'billing.report_transfer cần PlatformTx + InvoicesService');
    if (!UUID_V7.test(input.invoice_id)) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    const r = await this.invoices.report(ptx, ctx.workspaceId, input.invoice_id);
    return { result: { invoice_id: input.invoice_id, status: r.status }, before: { status: r.before }, after: { status: r.status } };
  }
}
