// Gửi chứng từ bán hàng cho khách (TIP-032b P2, COMMERCE §4–5): xác nhận đơn (PDF: dòng hàng + trạng thái thanh toán) và phiếu thu (PDF
// của một khoản thu). Gửi vào hội thoại của khách trên kênh chọn (mặc định kênh đơn / đề nghị đã gửi) — tin hiện ở Hộp thư, đi qua outbox +
// hàng gửi kênh; webchat kèm link công khai xem / tải. Risk send → xem trước người nhận + kênh; Idempotency-Key bắt buộc (executor).
import { z } from 'zod';
import { defineAction } from './define';
import { docChannel } from './sales-schemas';

const id = z.string().min(1);
const sent = z.object({ message_id: z.string(), conversation_id: z.string(), channel: z.string() });

export const orderSendConfirmation = defineAction({
  id: 'order.send_confirmation',
  module: 'sales',
  title: 'actions.order.send_confirmation.title',
  description:
    'Send the order confirmation (PDF with items, total, paid / left) to the customer on their conversation (zalo_personal | email | webchat; default = the order conversation). Example: {"order_id":"ord_290411","channel":"zalo_personal"}',
  input: z.object({ order_id: id, channel: docChannel.optional() }),
  output: sent.extend({ order_id: z.string() }),
  permission: 'order.manage',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['orders', 'conversations'],
});

export const receiptSend = defineAction({
  id: 'receipt.send',
  module: 'sales',
  title: 'actions.receipt.send.title',
  description:
    'Send the receipt PDF (phiếu thu) of one confirmed payment to the customer (zalo_personal | email | webchat; default = the payment request conversation). Example: {"payment_id":"pay_1","channel":"zalo_personal"}',
  input: z.object({ payment_id: id, channel: docChannel.optional() }),
  output: sent.extend({ payment_id: z.string(), receipt_code: z.string() }),
  permission: 'payment.record',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['invoices', 'conversations'],
});
