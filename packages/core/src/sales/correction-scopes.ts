// Scope bản ghi gốc cho đính chính hành động đã gửi (TIP-003e §4, DC-292): báo giá / đơn / đề nghị / phiếu thu — cùng hàm "thấy được"
// của domain (ngoài scope → 404). Kernel gọi qua registry, không import sales.
import { AppError } from '@appchat/shared';
import { registerCorrectionScope } from '../kernel/actions/correction.handler';
import { visibleOrder } from './orders/order-access';
import { UUID, visibleInvoice } from './payments/invoice-access';
import { visibleQuote } from './quotes/quote-access';

export function registerSalesCorrectionScopes(): void {
  registerCorrectionScope('quote', visibleQuote);
  registerCorrectionScope('order', visibleOrder);
  registerCorrectionScope('invoice', visibleInvoice);
  // Phiếu thu (`receipt.send` → `payment_id`): thấy khi thấy đề nghị (hoặc đơn) của khoản thu.
  registerCorrectionScope('payment', async (tx, authz, id) => {
    const p = UUID.test(id) ? await tx.customerPayment.findUnique({ where: { id }, select: { invoiceId: true, orderId: true } }) : null;
    if (p?.invoiceId) return visibleInvoice(tx, authz, p.invoiceId);
    if (p?.orderId) return visibleOrder(tx, authz, p.orderId);
    throw new AppError('NOT_FOUND', 404, { payment_id: 'not_found' });
  });
}
