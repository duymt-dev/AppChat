// platform (Blueprint §3.4 — permission `platform_admin`, user `is_platform_admin`). Quản trị nền tảng đầy đủ là TIP-040;
// TIP-010 mở `admin.invoice.confirm_transfer` để duyệt chuyển khoản thủ công (REQ-L04). Không gắn workspace của người gọi:
// hoá đơn mang workspace riêng.
import { z } from 'zod';
import { defineAction } from './define';

export const adminInvoiceConfirmTransfer = defineAction({
  id: 'admin.invoice.confirm_transfer',
  module: 'billing',
  title: 'actions.admin.invoice.confirm_transfer.title',
  description: 'Platform admin: confirm a manual bank transfer for a platform invoice, marking it paid and activating the plan or credits. Example: {"invoice_id":"0190f…"}',
  input: z.object({ invoice_id: z.string().uuid(), note: z.string().max(300).optional() }),
  output: z.object({ invoice_id: z.string(), status: z.literal('paid') }),
  permission: 'platform_admin',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});
