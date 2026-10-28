// Đề nghị thanh toán (tên kỹ thuật invoice — Blueprint §3.4 sales; COMMERCE-DECISIONS §5). Prototype L5233–5341 ("Hóa đơn" → "Đề nghị thanh toán").
// draft → sent → partial → paid; quá hạn chưa đủ → overdue; huỷ → void. Không thay thế hoá đơn GTGT (e-invoice qua EInvoiceProvider ở P2).
import { z } from 'zod';
import { defineAction } from './define';
import { money } from './sales-schemas';

const invoiceId = z.string().min(1);
const opened = (o: { invoice_id: string }) => ({
  type: 'open' as const,
  entity: 'invoice',
  id: o.invoice_id,
  view: 'drawer' as const,
});

export const invoiceCreate = defineAction({
  id: 'invoice.create',
  module: 'sales',
  title: 'actions.invoice.create.title',
  description:
    'Create a payment request (Đề nghị thanh toán, code TT-…) for an order or a customer: kind deposit / installment / full, due date defaults to +7 days. Status draft until sent. Example: {"order_id":"ord_290411","contact_id":"ct_lan","kind":"installment","amount":"6400000"}',
  input: z.object({
    order_id: z.string().optional(),
    contact_id: z.string().min(1),
    kind: z.enum(['deposit', 'installment', 'full']),
    amount: money.refine((v) => Number(v) > 0),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    title: z.string().max(200).optional(),
    note: z.string().max(2000).optional(),
  }),
  output: z.object({ invoice_id: z.string(), code: z.string() }),
  permission: 'invoice.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['invoices', 'orders'],
  uiTarget: opened,
});

export const invoiceSendPaymentQr = defineAction({
  id: 'invoice.send_payment_qr',
  module: 'sales',
  title: 'actions.invoice.send_payment_qr.title',
  description:
    'Send the payment request with a VietQR (amount left + transfer content = code) to the customer on their channel; draft → sent. Also used to re-send a reminder. Example: {"invoice_id":"inv_2040","channel":"zalo_personal"}',
  input: z.object({ invoice_id: invoiceId, channel: z.enum(['zalo_personal', 'email']) }),
  output: z.object({ invoice_id: z.string(), status: z.string() }),
  permission: 'invoice.manage',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['invoices'],
});

export const invoiceRecordPayment = defineAction({
  id: 'invoice.record_payment',
  module: 'sales',
  title: 'actions.invoice.record_payment.title',
  description:
    'Manually confirm a customer payment against a payment request (method qr / bank_transfer / cash / card); amount ≤ amount left. Recomputes invoice status (partial / paid) and the order pay status, issues a receipt (phiếu thu).',
  input: z.object({
    invoice_id: invoiceId,
    amount: money.refine((v) => Number(v) > 0),
    method: z.enum(['qr', 'bank_transfer', 'cash', 'card']),
    reference: z.string().max(100).optional(),
    paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().max(500).optional(),
  }),
  output: z.object({
    invoice_id: z.string(),
    payment_id: z.string(),
    status: z.string(),
    receipt_code: z.string(),
  }),
  permission: 'payment.record',
  risk: 'money',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['invoices', 'orders'],
});

export const invoiceResolveBankMatch = defineAction({
  id: 'invoice.resolve_bank_match',
  module: 'sales',
  title: 'actions.invoice.resolve_bank_match.title',
  description:
    'Resolve an uncertain bank transaction from the "Cần đối soát" queue (missing code / amount mismatch) by assigning it to a payment request; records a confirmed payment.',
  input: z.object({ bank_tx_id: z.string().min(1), invoice_id: invoiceId }),
  output: z.object({ invoice_id: z.string(), payment_id: z.string(), status: z.string() }),
  permission: 'payment.record',
  risk: 'money',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['invoices', 'orders'],
});

export const invoiceVoid = defineAction({
  id: 'invoice.void',
  module: 'sales',
  title: 'actions.invoice.void.title',
  description:
    'Void a payment request that has no confirmed payment (reason required). Requests with money collected must go through a refund instead.',
  input: z.object({ invoice_id: invoiceId, reason: z.string().trim().min(1).max(500) }),
  output: z.object({ invoice_id: z.string(), status: z.string() }),
  permission: 'invoice.manage',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['invoices', 'orders'],
});
