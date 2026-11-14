// platform (Blueprint §3.4 — permission `platform_admin`, user `is_platform_admin`). Quản trị nền tảng đầy đủ là TIP-040;
// TIP-010 mở `admin.invoice.confirm_transfer` để duyệt chuyển khoản thủ công (REQ-L04). Không gắn workspace của người gọi:
// hoá đơn mang workspace riêng.
import { z } from 'zod';
import { defineAction } from './define';

export const adminInvoiceConfirmTransfer = defineAction({
  id: 'admin.invoice.confirm_transfer',
  module: 'billing',
  title: 'actions.admin.invoice.confirm_transfer.title',
  description: 'Platform admin: confirm a manual bank transfer for a platform invoice, marking it paid and activating the plan or credits. Requires a reason and manual evidence (for example the sender bank reference). Example: {"invoice_id":"0190f000-0000-7000-8000-000000000002","note":"paid from another bank","evidence":"VCB ref FT2611070001"}',
  // Duyệt tay KHÔNG có giao dịch ngân hàng (khách chuyển từ tài khoản khác / ngân hàng khác…) — lý do + bằng chứng bắt buộc (TIP-040).
  input: z.object({ invoice_id: z.string().uuid(), note: z.string().trim().min(3).max(300), evidence: z.string().trim().min(3).max(300) }),
  output: z.object({ invoice_id: z.string(), status: z.literal('paid') }),
  permission: 'platform_admin',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});

export const adminBankTransactionMatch = defineAction({
  id: 'admin.bank_transaction.match',
  module: 'billing',
  title: 'actions.admin.bank_transaction.match.title',
  description: 'Platform admin: match one unmatched incoming bank transaction to one payable platform invoice (exact amount, platform account), marking the invoice paid. Over / under payments are not auto-handled. Example: {"bank_transaction_id":"0190f000-0000-7000-8000-000000000003","invoice_id":"0190f000-0000-7000-8000-000000000002","reason":"customer typed wrong transfer code"}',
  input: z.object({ bank_transaction_id: z.string().uuid(), invoice_id: z.string().uuid(), reason: z.string().trim().min(3).max(300) }).strict(),
  output: z.object({ invoice_id: z.string(), bank_transaction_id: z.string(), status: z.literal('paid') }),
  permission: 'platform_admin',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['billing', 'admin'],
  db: 'platform',
});
