// Shape đọc Đề nghị thanh toán (FE ↔ BE — gap-filling §5, TIP-032): GET /v1/invoices (D42), /invoices/:id, /invoices/meta (?invoice_id=
// kèm thẻ CRM / tệp của đề nghị đó), /invoices/:id/pdf, /invoices/receipts/:paymentId/pdf, /settings/payments (tài khoản nhận + bank feed).
// Mock transport (apps/web) và API thật parse cùng schema. Tiền là string VND.
import { z } from 'zod';
import { INVOICE_KINDS, INVOICE_STATUSES, PACKAGE_STATUSES } from '../sales/invoice-state';

export const vietQrSchema = z.object({
  bank: z.string(),
  bin: z.string(),
  account_no: z.string(),
  account_name: z.string(),
  amount: z.string(),
  content: z.string(),
  payload: z.string(),
});

export const invoicePaymentSchema = z.object({
  id: z.string(),
  /** deposit | payment | points | refund */
  kind: z.string(),
  /** Số dương; hoàn tiền là số đã hoàn (kind = refund). */
  amount: z.string(),
  method: z.string(),
  reference: z.string(),
  /** pending | confirmed | failed | needs_review */
  status: z.string(),
  at: z.string(),
  by: z.string(),
  receipt_code: z.string(),
  auto: z.boolean(),
  reason: z.string().optional(),
});

export const invoiceEventSchema = z.object({
  type: z.string(),
  at: z.string(),
  actor: z.string(),
  amount: z.string().optional(),
  channel: z.string().optional(),
  reason: z.string().optional(),
});

export const invoiceRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  transfer_code: z.string(),
  order_id: z.string().nullable(),
  order_code: z.string(),
  kind: z.enum(INVOICE_KINDS),
  contact_id: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  owner_user_id: z.string(),
  owner_name: z.string(),
  title: z.string(),
  amount: z.string(),
  paid_amount: z.string(),
  left: z.string(),
  paid_pct: z.number().int(),
  status: z.enum(INVOICE_STATUSES),
  issued_at: z.string(),
  due_date: z.string(),
  sent_at: z.string(),
  void_reason: z.string(),
  /** Đã hoàn (khoản hoàn đã duyệt) + đang chờ duyệt. */
  refunded: z.string(),
  refund_pending: z.string(),
  payments: z.array(invoicePaymentSchema),
  events: z.array(invoiceEventSchema),
  ai: z.object({ text: z.string(), acts: z.array(z.string()) }),
  qr: vietQrSchema.nullable(),
});
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;

export const invoicesPageSchema = z.object({
  data: z.array(invoiceRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

export const bankTxSchema = z.object({
  id: z.string(),
  amount: z.string(),
  content: z.string(),
  occurred_at: z.string(),
  provider: z.string(),
  /** missing_code | amount_mismatch | invoice_closed */
  reason: z.string(),
  suggested_invoice_id: z.string(),
  status: z.string(),
});

export const paymentAccountSchema = z.object({ bank: z.string(), bin: z.string(), account_no: z.string(), account_name: z.string() });

export const refundRequestSchema = z.object({
  id: z.string(),
  invoice_id: z.string().nullable(),
  invoice_code: z.string(),
  package_id: z.string().nullable(),
  contact_name: z.string(),
  amount: z.string(),
  reason: z.string(),
  by: z.string(),
  at: z.string(),
});

export const invoicesMetaSchema = z.object({
  stats: z.object({ total: z.number().int(), collected: z.string(), pending: z.string(), overdue: z.string() }),
  /** Hàng "Cần đối soát" — chỉ người có `payment.record`. */
  bank_txs: z.array(bankTxSchema),
  /** Hoàn tiền chờ duyệt — chỉ người có `payment.refund_approve`. */
  refunds: z.array(refundRequestSchema),
  payment_account: paymentAccountSchema.nullable(),
  /** Thẻ CRM của khách: số đề nghị, tỉ lệ đúng hạn, công nợ theo khách (TIP-015b — cùng công thức Hồ sơ 360°). */
  crm: z.object({ total: z.number().int(), on_time: z.string(), debt: z.string().optional(), overdue: z.string().optional() }),
  files: z.array(z.object({ name: z.string(), ext: z.string(), by: z.string(), at: z.string(), size: z.string(), url: z.string().optional() })),
});

export const customerPackageSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  product_id: z.string(),
  order_id: z.string(),
  name: z.string(),
  total: z.number().int(),
  used: z.number().int(),
  expires_at: z.string(),
  status: z.enum(PACKAGE_STATUSES),
});

export const paymentSettingsSchema = z.object({
  payment_account: paymentAccountSchema.nullable(),
  bank_feeds: z.array(z.object({ provider: z.string(), feed_id: z.string(), account_no: z.string(), status: z.string(), last_tx_at: z.string(), webhook_path: z.string() })),
});
