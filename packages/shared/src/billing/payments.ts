// Luật hoá đơn gói AppChat (REQ-L04, COMMERCE §10, TIP-010): QR 15 phút, mã hoá đơn / nội dung chuyển khoản, khớp mã trong
// nội dung giao dịch ngân hàng. Dùng chung core (sinh / khớp) và web (hiển thị).
import { ADDONS, CREDIT_PACKS } from './catalog';

/** VietQR động hết hạn 15 phút (REQ-L04). */
export const INVOICE_QR_TTL_MS = 15 * 60_000;

/** Mã hiển thị `INV-<năm>-<n>` (n từ sequence nền tảng, ≥ 4 chữ số). */
export const invoiceCode = (year: number, n: number | bigint) => `INV-${year}-${String(n).padStart(4, '0')}`;

/** Nội dung chuyển khoản: `APPCHAT INV<năm><n>` — chỉ A–Z, 0–9, khoảng trắng, ≤ 25 ký tự (ngân hàng bỏ ký tự lạ). */
export const platformTransferCode = (code: string) => `APPCHAT ${code.replace(/-/g, '')}`;

/** Khoá so khớp: bỏ mọi ký tự không phải chữ / số, viết hoa (ngân hàng hay chèn / xoá khoảng trắng, gạch). */
const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Nội dung giao dịch có chứa mã chuyển khoản không (sau khi bỏ khoảng trắng / dấu câu). */
export const contentMatches = (content: string, transferCode: string) => squash(content).includes(squash(transferCode));

/** Mã hoá đơn (INV…) xuất hiện trong nội dung giao dịch — để tra hoá đơn. null nếu không có. */
export function findInvoiceRef(content: string): string | null {
  const m = /INV(\d{4})(\d{4,})/.exec(squash(content));
  return m ? `INV-${m[1]}-${m[2]}` : null;
}

export type InvoiceItemKind = 'plan' | 'credit' | 'addon';

/** Mặt hàng mua thêm không thuộc bảng `plan` (credit / tài nguyên) — giá + credit + khoá mô tả. */
export function catalogItem(kind: 'credit' | 'addon', item: string): { amount: bigint; credits: number; desc: string; params: Record<string, string | number> } | null {
  if (kind === 'credit') {
    const p = CREDIT_PACKS.find((x) => x.key === item);
    return p ? { amount: BigInt(p.price), credits: p.credits, desc: 'credits', params: { credits: p.credits } } : null;
  }
  const a = ADDONS.find((x) => x.key === item);
  return a ? { amount: BigInt(a.price), credits: 0, desc: `addon_${a.kind}`, params: {} } : null;
}
