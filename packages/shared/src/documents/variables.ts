// Registry biến chuẩn của mẫu chứng từ (standards/documents/templates.md §3, D30). Nhãn qua i18n `documents.var.<key>`.
// Mẫu chỉ chứa biến — số liệu luôn đến từ bản ghi có cấu trúc. Biến lạ trong mẫu → lỗi khi lưu (validateTemplateVars).

export type DocKind = 'quote' | 'contract' | 'payment_request' | 'receipt';
export const DOC_KINDS: readonly DocKind[] = ['quote', 'contract', 'payment_request', 'receipt'];

export type VarGroup = 'business' | 'customer' | 'doc' | 'items' | 'totals' | 'contract' | 'payment' | 'signatures';

export interface DocVar {
  key: string;
  group: VarGroup;
  /** Loại chứng từ dùng được biến này. */
  kinds: readonly DocKind[];
}

const ALL = DOC_KINDS;
const SALES: readonly DocKind[] = ['quote', 'contract', 'payment_request'];

export const DOC_VARIABLES: readonly DocVar[] = [
  ...['legal_name', 'tax_code', 'address', 'representative', 'logo', 'bank_account'].map((k) => ({ key: `business.${k}`, group: 'business' as const, kinds: ALL })),
  ...['name', 'tax_code', 'address', 'phone', 'email', 'representative'].map((k) => ({ key: `customer.${k}`, group: 'customer' as const, kinds: ALL })),
  ...['code', 'date', 'valid_until', 'owner'].map((k) => ({ key: `doc.${k}`, group: 'doc' as const, kinds: ALL })),
  { key: 'items', group: 'items', kinds: SALES },
  ...['subtotal', 'discount', 'vat', 'total', 'total_words'].map((k) => ({ key: `totals.${k}`, group: 'totals' as const, kinds: ALL })),
  ...['kind', 'value', 'start', 'end'].map((k) => ({ key: `contract.${k}`, group: 'contract' as const, kinds: ['contract'] as const })),
  ...['vietqr', 'transfer_note'].map((k) => ({ key: `payment.${k}`, group: 'payment' as const, kinds: ['payment_request', 'receipt'] as const })),
  ...['seller', 'buyer'].map((k) => ({ key: `signatures.${k}`, group: 'signatures' as const, kinds: ['contract', 'receipt'] as const })),
];

export const varsForKind = (kind: DocKind) => DOC_VARIABLES.filter((v) => v.kinds.includes(kind));

/** Dòng pháp lý bắt buộc trên đề nghị thanh toán / phiếu thu (COMMERCE §5, templates.md §6) — không cho xoá khỏi mẫu. */
export const NOT_VAT_KINDS: readonly DocKind[] = ['payment_request', 'receipt'];

/** Biến trong mẫu không có trong registry của loại chứng từ (trả danh sách biến lạ; rỗng = hợp lệ). */
export const validateTemplateVars = (kind: DocKind, used: readonly string[]): string[] => {
  const ok = new Set(varsForKind(kind).map((v) => v.key));
  return used.filter((u) => !ok.has(u));
};

/** Bảng kiểm pháp lý theo loại (cảnh báo, không chặn — templates.md §6; Điều 398 BLDS 2015 cho hợp đồng). */
export const LEGAL_CHECKLIST: Record<DocKind, readonly string[]> = {
  contract: ['parties', 'subject', 'quantity', 'price_payment', 'term_place', 'rights', 'breach', 'dispute', 'effective'],
  quote: ['seller_tax', 'date', 'validity', 'vat_note'],
  payment_request: ['not_vat'],
  receipt: ['not_vat'],
};
