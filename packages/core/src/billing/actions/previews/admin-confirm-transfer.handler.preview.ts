// Preview admin duyệt chuyển khoản (TIP-023b R2.8, risk money): mã · workspace · số tiền, trạng thái → paid + cảnh báo kích hoạt gói / cộng
// credit sau commit; đã paid / huỷ → 409, hoá đơn lạ → 404 như execute. Hoá đơn của workspace bất kỳ (platform_admin). Chỉ đọc DB nền tảng.
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, adminInvoiceConfirmTransfer } from '@appchat/actions';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { invoiceOf } from './billing-cancel-invoice.handler.preview';

const PAYABLE = ['pending', 'pending_review', 'expired'];

export async function confirmTransferPreview(p: Pick<PlatformDb, 'billingInvoice' | 'workspace'>, i: ActionInput<typeof adminInvoiceConfirmTransfer>): Promise<ActionPreview> {
  const inv = await invoiceOf(p, null, i.invoice_id);
  if (!PAYABLE.includes(inv.status)) throw new AppError('CONFLICT', 409, { status: inv.status });
  const ws = await p.workspace.findUnique({ where: { id: inv.workspaceId }, select: { name: true } });
  return preview('money', line(inv.code, ws?.name, String(inv.amount)), {
    changes: updated('billing_invoice', inv.id, { status: inv.status }, { status: 'paid' }),
    warnings: [inv.kind === 'credits' ? 'credits_added' : 'plan_activated'],
  });
}
