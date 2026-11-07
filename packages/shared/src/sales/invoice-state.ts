// Đề nghị thanh toán (COMMERCE §5, state-machine §6–8): `draft` / `void` do action đặt; `sent` / `partial` / `paid` / `overdue` SUY RA từ
// số đã thu + hạn (`invoiceStatusOf`) — mọi chỗ đổi số đã thu và job quét quá hạn gọi cùng hàm. Dùng chung BE, mock FE, nút UI.
// Khớp chuyển khoản: nội dung chứa mã `TT…` (bỏ gạch / khoảng trắng — ngân hàng hay xoá) + đúng số còn phải thu.
import { defineFlow } from '../state/flow';

export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'] as const;
export type InvoiceStatusKey = (typeof INVOICE_STATUSES)[number];
export const INVOICE_KINDS = ['deposit', 'installment', 'full'] as const;
export type InvoiceKindKey = (typeof INVOICE_KINDS)[number];
export const PAY_METHODS = ['qr', 'bank_transfer', 'cash', 'card'] as const;
export const PAYMENT_KINDS = ['deposit', 'payment', 'points', 'refund'] as const;
export const PAYMENT_STATUSES = ['pending', 'confirmed', 'failed', 'needs_review'] as const;
export const PACKAGE_STATUSES = ['active', 'exhausted', 'expired', 'refunded'] as const;
export type PackageStatusKey = (typeof PACKAGE_STATUSES)[number];

/** Hạn thanh toán mặc định (ngày — COMMERCE §5). */
export const INVOICE_DUE_DAYS = 7;
/** Mốc nhắc công nợ so với hạn (ngày): T-1 (trước hạn), T+1, T+7 (quá hạn). */
export const INVOICE_REMINDERS = [
  { key: 'T-1', offset: -1 },
  { key: 'T+1', offset: 1 },
  { key: 'T+7', offset: 7 },
] as const;
/** Liệu trình: nhắc gia hạn khi còn 1 buổi hoặc còn ≤ 7 ngày (COMMERCE §6). */
export const PACKAGE_REMIND_DAYS = 7;

/** Bảng action đổi trạng thái (trạng thái suy ra đi theo `invoiceStatusOf`). Ghi nhận khoản thu không đổi qua bảng này. */
export const INVOICE_FLOW = defineFlow<InvoiceStatusKey>({
  draft: { 'invoice.send_payment_qr': 'sent', 'invoice.void': 'void' },
  sent: { 'invoice.send_payment_qr': 'sent', 'invoice.void': 'void' },
  partial: { 'invoice.send_payment_qr': 'partial' },
  overdue: { 'invoice.send_payment_qr': 'overdue' },
  paid: {},
  void: {},
  terminal: ['paid', 'void'],
});

/** Có thể ghi nhận / khớp khoản thu (nháp = khách trả trước khi gửi → coi như đã gửi). */
export const INVOICE_PAYABLE: readonly InvoiceStatusKey[] = ['draft', 'sent', 'partial', 'overdue'];

export interface InvoiceStatusInput {
  status: InvoiceStatusKey;
  amount: bigint | number | string;
  paid: bigint | number | string;
  /** Hạn `YYYY-MM-DD` và hôm nay theo giờ workspace. */
  due: string;
  today: string;
}

/** Trạng thái sau khi đổi số đã thu / qua ngày: void giữ; nháp chưa thu giữ nháp; đủ → paid; quá hạn chưa đủ → overdue. */
export function invoiceStatusOf(i: InvoiceStatusInput): InvoiceStatusKey {
  if (i.status === 'void') return 'void';
  const paid = BigInt(i.paid);
  if (paid >= BigInt(i.amount)) return 'paid';
  if (i.status === 'draft' && paid === 0n) return 'draft';
  if (i.due < i.today) return 'overdue';
  return paid > 0n ? 'partial' : 'sent';
}

/** Nội dung chuyển khoản của đề nghị: `TT-002041` → `TT002041` (VietQR + khớp). */
export const invoiceTransferCode = (code: string) => code.replace(/-/g, '');

const upper = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

/** Mã đề nghị (`TT-…`) trong nội dung giao dịch: `TT002041`, `TT-002041`, `TT 002041` (ngân hàng hay xoá / chèn dấu). Không gộp
 *  khoảng trắng sau mã — tránh dính số điện thoại / số tài khoản phía sau. */
export function findInvoiceCode(content: string): string | null {
  const m = /TT[\s.-]?(\d{6,})(?!\d)/.exec(upper(content));
  return m ? `TT-${m[1]}` : null;
}

export type BankMatch = { kind: 'match'; code: string } | { kind: 'review'; reason: 'missing_code' | 'amount_mismatch' | 'invoice_closed'; code: string | null };

/** Khớp chắc: có mã + đề nghị còn mở + đúng số còn phải thu. Còn lại → "Cần đối soát" (COMMERCE §5). */
export function matchBankTx(content: string, amount: bigint, invoice: { code: string; status: InvoiceStatusKey; left: bigint } | null): BankMatch {
  const code = findInvoiceCode(content);
  if (!code || !invoice) return { kind: 'review', reason: 'missing_code', code };
  if (!INVOICE_PAYABLE.includes(invoice.status)) return { kind: 'review', reason: 'invoice_closed', code };
  if (amount !== invoice.left) return { kind: 'review', reason: 'amount_mismatch', code };
  return { kind: 'match', code };
}

/** Số tiền hoàn của liệu trình theo tỉ lệ buổi còn lại (COMMERCE §6), làm tròn xuống đồng. */
export const packageRefundOf = (paid: bigint, total: number, used: number): bigint => (total > 0 ? (paid * BigInt(Math.max(0, total - used))) / BigInt(total) : 0n);
