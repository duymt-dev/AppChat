// Preview huỷ hoá đơn gói (TIP-023b R2.8): mã · mặt hàng · số tiền, trạng thái → cancelled; không thuộc workspace → 404, không còn chờ → 409
// như execute. Chỉ đọc DB nền tảng.
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, billingCancelInvoice } from '@appchat/actions';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { UUID_V7 } from '../../../kernel/ids';

export async function invoiceOf(p: Pick<PlatformDb, 'billingInvoice'>, ws: string | null, id: string) {
  const inv = UUID_V7.test(id) ? await p.billingInvoice.findFirst({ where: { id, ...(ws ? { workspaceId: ws } : {}) } }) : null;
  if (!inv) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
  return inv;
}

export async function cancelInvoicePreview(p: Pick<PlatformDb, 'billingInvoice'>, ws: string, i: ActionInput<typeof billingCancelInvoice>): Promise<ActionPreview> {
  const inv = await invoiceOf(p, ws, i.invoice_id);
  if (!['pending', 'pending_review'].includes(inv.status)) throw new AppError('CONFLICT', 409, { status: inv.status });
  return preview('write', line(inv.code, inv.item, String(inv.amount)), { changes: updated('billing_invoice', inv.id, { status: inv.status }, { status: 'cancelled' }) });
}
