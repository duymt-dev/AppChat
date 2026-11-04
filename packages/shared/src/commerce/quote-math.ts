// Cách tính báo giá / đơn (COMMERCE-DECISIONS §3): chiết khấu theo dòng (% hoặc số tiền) và trên tổng;
// thuế tính trên số tiền SAU chiết khấu theo thuế suất từng dòng; tiền là số nguyên VND, I/O dạng string.
export type Discount = { kind: 'pct'; value: number } | { kind: 'amount'; value: string };

export interface LineInput {
  qty: number;
  unit_price: string;
  tax_rate: number;
  discount?: Discount | null;
}

export interface Totals {
  subtotal: string;
  line_discount_total: string;
  header_discount_total: string;
  discount_total: string;
  tax_total: string;
  total: string;
  lines: { gross: string; net: string }[];
}

/** Ngưỡng duyệt (COMMERCE §3): tổng > 20.000.000đ hoặc giảm vượt 5%. */
export const APPROVAL_TOTAL = 20_000_000;
export const APPROVAL_DISCOUNT_PCT = 5;
/** Hiệu lực báo giá mặc định — 15 ngày kể từ lúc gửi (Q4). */
export const QUOTE_VALID_DAYS = 15;

const n = (v: string | number | undefined | null) => Math.round(Number(v ?? 0) || 0);
const cut = (base: number, d?: Discount | null) => {
  if (!d) return 0;
  const raw = d.kind === 'pct' ? (base * Math.min(Math.max(d.value, 0), 100)) / 100 : n(d.value);
  return Math.min(Math.round(raw), base);
};

export function quoteTotals(lines: LineInput[], header?: Discount | null): Totals {
  const rows = lines.map((l) => {
    const gross = Math.round(l.qty * n(l.unit_price));
    const net = gross - cut(gross, l.discount);
    return { gross, net, tax_rate: l.tax_rate };
  });
  const subtotal = rows.reduce((a, r) => a + r.gross, 0);
  const afterLine = rows.reduce((a, r) => a + r.net, 0);
  const headerCut = cut(afterLine, header);
  // Chiết khấu tổng phân bổ theo tỉ lệ giá trị dòng để thuế từng dòng tính sau chiết khấu.
  const tax = rows.reduce((a, r) => {
    const share = afterLine ? r.net - (headerCut * r.net) / afterLine : 0;
    return a + (share * r.tax_rate) / 100;
  }, 0);
  const taxTotal = Math.round(tax);
  const lineCut = subtotal - afterLine;
  return {
    subtotal: String(subtotal),
    line_discount_total: String(lineCut),
    header_discount_total: String(headerCut),
    discount_total: String(lineCut + headerCut),
    tax_total: String(taxTotal),
    total: String(afterLine - headerCut + taxTotal),
    lines: rows.map((r) => ({ gross: String(r.gross), net: String(r.net) })),
  };
}

/** Ngưỡng duyệt của workspace (`commerce_settings` — COMMERCE §3 Q5 "cấu hình được"); thiếu thì dùng mặc định luật. */
export interface ApprovalPolicy {
  total_vnd: string;
  discount_pct: number;
}
export const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = { total_vnd: String(APPROVAL_TOTAL), discount_pct: APPROVAL_DISCOUNT_PCT };

/**
 * Lý do cần duyệt trước khi gửi (rỗng = gửi được ngay). `policy` = ngưỡng workspace; `agentMaxPct` = trần giảm giá AI Governance khi báo
 * giá do agent / tác vụ tạo (COMMERCE Q5 — Owner thao tác trên UI không bị trần agent chặn). Giảm giá vượt mức nào thấp hơn thì duyệt.
 */
export function approvalReasons(
  t: Totals,
  opts: { offCatalog?: boolean; agentMaxPct?: number; policy?: ApprovalPolicy } = {},
): ('total' | 'discount' | 'off_catalog')[] {
  const out: ('total' | 'discount' | 'off_catalog')[] = [];
  const p = opts.policy ?? DEFAULT_APPROVAL_POLICY;
  const sub = n(t.subtotal);
  if (BigInt(n(t.total)) > BigInt(p.total_vnd)) out.push('total');
  const cap = opts.agentMaxPct === undefined ? p.discount_pct : Math.min(p.discount_pct, opts.agentMaxPct);
  if (sub && (n(t.discount_total) / sub) * 100 > cap) out.push('discount');
  if (opts.offCatalog) out.push('off_catalog');
  return out;
}
