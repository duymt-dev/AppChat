// Preview "Tôi đã chuyển khoản" (TIP-023b R2.8): mã · số tiền, pending / expired → pending_review (chờ đối soát); đã paid / đang chờ đối soát
// → không đổi; huỷ → 409, không thuộc workspace → 404 như execute. Chỉ đọc DB nền tảng.
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, billingReportTransfer } from '@appchat/actions';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { invoiceOf } from './billing-cancel-invoice.handler.preview';

export async function reportTransferPreview(p: Pick<PlatformDb, 'billingInvoice'>, ws: string, i: ActionInput<typeof billingReportTransfer>): Promise<ActionPreview> {
  const inv = await invoiceOf(p, ws, i.invoice_id);
  if (inv.status === 'cancelled') throw new AppError('CONFLICT', 409, { status: inv.status });
  const to = inv.status === 'paid' || inv.status === 'pending_review' ? inv.status : 'pending_review';
  return preview('write', line(inv.code, String(inv.amount)), { changes: updated('billing_invoice', inv.id, { status: inv.status }, { status: to }) });
}
