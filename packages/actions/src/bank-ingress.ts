// Ingress ngân hàng (TIP-012b P2, DC-383): `bank_feed.ingest` — CHỈ hệ thống: consumer `bank_receipt.accepted` (ROLE=jobs) gọi qua
// ActionExecutor nguồn system, actor `system:bank-ingress`. Input chỉ là id biên nhận đã ghi bởi webhook ĐÃ xác thực — handler tự nạp
// biên nhận + feed hiện tại; người / Trợ lý / agent / HTTP không gọi được (SYSTEM_ONLY + guard actor), JSON do người gửi không thể
// giả biên nhận. Khớp / ghi nhận dùng lại luật COMMERCE §5 hiện có (matchBankTx + recordInvoicePayment).
import { z } from 'zod';
import { defineAction } from './define';

export const bankFeedIngest = defineAction({
  id: 'bank_feed.ingest',
  module: 'sales',
  title: 'actions.bank_feed.ingest.title',
  description:
    'System-only: process one authenticated bank receipt (accepted by the webhook) into a bank transaction and, when the TT… code and amount match, a confirmed payment. Not callable by users, assistant or agents. Example: {"receipt_id":"0190f000-0000-7000-8000-0000000000e1"}',
  input: z.object({ receipt_id: z.string().uuid() }),
  output: z.object({ status: z.enum(['matched', 'review', 'ignored', 'duplicate']), bank_tx_id: z.string().nullable() }),
  permission: 'finance.manage',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['invoices', 'orders'],
});
