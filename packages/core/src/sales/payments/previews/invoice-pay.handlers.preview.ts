// Preview đối soát giao dịch ngân hàng (TIP-023b R2.8): gán giao dịch "Cần đối soát" cho đề nghị → mã + khách + số tiền giao dịch + đã thu /
// trạng thái đề nghị trước / sau; giao dịch đã xử lý → 409, vượt còn phải thu → 422, đề nghị đã đóng → 409 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, invoiceResolveBankMatch } from '@appchat/actions';
import { AppError, INVOICE_PAYABLE } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { UUID, visibleInvoice } from '../invoice-access';
import { localDay, statusAfter } from '../services/payment-write';
import { label, money } from './invoice-write.handlers.preview';

export async function bankMatchPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof invoiceResolveBankMatch>, now: Date, timeZone: string): Promise<ActionPreview> {
  const bt = UUID.test(i.bank_tx_id) ? await tx.bankTx.findUnique({ where: { id: i.bank_tx_id }, include: { feed: { select: { provider: true } } } }) : null;
  if (!bt) throw new AppError('NOT_FOUND', 404, { bank_tx_id: 'not_found' });
  if (bt.status !== 'needs_review') throw new AppError('INVALID_STATE', 409, { bank_tx_id: bt.status });
  const inv = await visibleInvoice(tx, ctx.authz, i.invoice_id);
  if (!INVOICE_PAYABLE.includes(inv.status)) throw new AppError('INVALID_STATE', 409, { status: inv.status });
  if (bt.amount > inv.amount - inv.paidAmount) throw new AppError('VALIDATION_FAILED', 422, { amount: 'invoice.amount_over' });
  const paid = inv.paidAmount + bt.amount;
  return preview('money', line(await label(tx, inv), money(bt.amount)), {
    changes: [
      { entity: 'bank_tx', id: bt.id, before: { status: bt.status }, after: { status: 'resolved', provider: bt.feed.provider, reference: bt.externalId, amount: String(bt.amount) } },
      ...updated('invoice', inv.id, { paid: String(inv.paidAmount), status: inv.status }, { paid: String(paid), status: statusAfter(inv, paid, localDay(now, timeZone)) }),
    ],
  });
}
