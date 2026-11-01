// Dữ liệu điền mẫu + render mẫu `rich` (templates.md §1–3) — dùng chung core (PDF qua LibreOffice) và mock FE (xem trước HTML).
// Mọi giá trị đã định dạng sẵn thành chữ (tiền "1.250.000₫", ngày theo locale) — mẫu chỉ đặt chỗ, không tính toán.
import { NOT_VAT_KINDS, type DocKind } from './variables';
import { hasNotVatLine } from './template-text';

export interface DocItem {
  no: string;
  name: string;
  unit: string;
  qty: string;
  price: string;
  discount: string;
  tax_rate: string;
  amount: string;
}

export interface DocData {
  business: Record<string, string>;
  customer: Record<string, string>;
  doc: Record<string, string>;
  items: DocItem[];
  totals: Record<string, string>;
  contract: Record<string, string>;
  payment: Record<string, string>;
  signatures: Record<string, string>;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const lookup = (scope: Record<string, unknown>, path: string): string => {
  let v: unknown = scope;
  for (const k of path.split('.')) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
  return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
};

const fill = (html: string, scope: Record<string, unknown>) =>
  html.replace(/\{\{\s*([a-z_][a-z0-9_.]*)\s*\}\}/gi, (_m, p: string) => esc(lookup(scope, p.toLowerCase())));

/**
 * Thân HTML của mẫu → HTML đã điền: vòng `{{#items}}…{{/items}}` lặp theo dòng hàng (cột dòng + biến chung), biến khác thay bằng
 * chữ đã escape. Đề nghị thanh toán / phiếu thu thiếu dòng "không thay thế hoá đơn GTGT" → tự chèn cuối (templates.md §6).
 */
export function renderRich(kind: DocKind, body: string, data: DocData, notVatLine: string): string {
  const base = data as unknown as Record<string, unknown>;
  let html = body.replace(/\{\{\s*#items\s*\}\}([\s\S]*?)\{\{\s*\/items\s*\}\}/gi, (_m, inner: string) =>
    data.items.map((it) => fill(inner, { ...base, ...it })).join(''),
  );
  html = fill(html, base);
  if (NOT_VAT_KINDS.includes(kind) && !hasNotVatLine(kind, html.replace(/<[^>]+>/g, ' '))) html += `<p>${esc(notVatLine)}</p>`;
  return html;
}

/** Trang HTML đầy đủ cho LibreOffice (A4, font chứng từ, bảng có viền). */
export const htmlPage = (title: string, inner: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>` +
  `@page{size:A4;margin:18mm 16mm}body{font-family:'Plus Jakarta Sans','Times New Roman',Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111}` +
  `h1,h2{text-align:center;margin:0 0 10pt}h3{font-size:11.5pt;margin:12pt 0 4pt}table{border-collapse:collapse;width:100%;margin:6pt 0}` +
  `th,td{border:1px solid #888;padding:4pt 6pt;vertical-align:top}th{background:#f2f2f2}` +
  `</style></head><body>${inner}</body></html>`;

/** Bỏ phần nguy hiểm khỏi HTML mẫu do người dùng soạn: script / iframe / object…, thuộc tính on*, link / ảnh ra ngoài (LibreOffice
 *  không được tải tài nguyên mạng — templates.md §8). Ảnh nhúng `data:` giữ nguyên. */
export function sanitizeTemplateHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|svg|math|form)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form|svg|math)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(src|href|background|srcset)\s*=\s*("|')(?!data:image\/|#)[^"']*\2/gi, '')
    .replace(/\s+(src|href|background|srcset)\s*=\s*(?!["'])(?!data:image\/|#)[^\s>]+/gi, '');
}
