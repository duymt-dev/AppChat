// Kiểu dữ liệu Đề nghị thanh toán — khớp response mock / API Blueprint §4.4 invoices (COMMERCE-DECISIONS §5).
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';
export type InvoiceKind = 'deposit' | 'installment' | 'full';
export type PayMethod = 'qr' | 'bank_transfer' | 'cash' | 'card';

export interface Payment {
  id: string;
  kind: string;
  amount: string;
  method: string;
  reference: string;
  status: string;
  at: string;
  by: string;
  receipt_code: string;
  auto: boolean;
  reason?: string;
}

export interface InvoiceEvent {
  type: string;
  at: string;
  actor: string;
  amount?: string;
  channel?: string;
  reason?: string;
}

export interface VietQr {
  bank: string;
  bin: string;
  account_no: string;
  account_name: string;
  amount: string;
  content: string;
  payload: string;
}

export interface Invoice {
  id: string;
  code: string;
  transfer_code: string;
  order_id: string | null;
  order_code: string;
  kind: InvoiceKind;
  contact_id: string;
  contact_name: string;
  phone: string;
  owner_user_id: string;
  owner_name: string;
  title: string;
  amount: string;
  paid_amount: string;
  left: string;
  paid_pct: number;
  status: InvoiceStatus;
  issued_at: string;
  due_date: string;
  sent_at: string;
  void_reason: string;
  /** Đã hoàn (đã duyệt) + đang chờ duyệt — tiền string VND. */
  refunded: string;
  refund_pending: string;
  payments: Payment[];
  events: InvoiceEvent[];
  ai: { text: string; acts: string[] };
  qr: VietQr | null;
}

export interface BankTx {
  id: string;
  amount: string;
  content: string;
  occurred_at: string;
  provider: string;
  reason: 'missing_code' | 'amount_mismatch' | 'invoice_closed' | string;
  suggested_invoice_id: string;
  status: string;
}

/** Yêu cầu hoàn tiền chờ duyệt (chỉ người có `payment.refund_approve` nhận). */
export interface RefundRequest {
  id: string;
  invoice_id: string | null;
  invoice_code: string;
  package_id: string | null;
  contact_name: string;
  amount: string;
  reason: string;
  by: string;
  at: string;
}

export interface InvoicesMeta {
  stats: { total: number; collected: string; pending: string; overdue: string };
  bank_txs: BankTx[];
  refunds: RefundRequest[];
  /** null = chưa khai tài khoản nhận → không sinh VietQR. */
  payment_account: { bank: string; bin: string; account_no: string; account_name: string } | null;
  /** Công nợ theo khách (TIP-015b) — vắng khi người xem không có quyền xem đề nghị. */
  crm: { total: number; on_time: string; debt?: string; overdue?: string };
}
