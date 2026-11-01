// Phân tích thân mẫu chứng từ (templates.md §3, §6) — dùng chung FE (trình soạn rich) và core (lưu / render):
// trích biến `{{a.b}}` (trong vòng `{{#items}}…{{/items}}` chỉ được dùng cột dòng hàng), bảng kiểm pháp lý theo nội dung + biến,
// dòng "không thay thế hoá đơn GTGT" của đề nghị thanh toán / phiếu thu.
import { foldText } from '../crm/phone';
import { LEGAL_CHECKLIST, NOT_VAT_KINDS, validateTemplateVars, type DocKind } from './variables';

/** Cột của một dòng hàng trong vòng `{{#items}}…{{/items}}`. */
export const ITEM_FIELDS = ['no', 'name', 'unit', 'qty', 'price', 'discount', 'tax_rate', 'amount'] as const;

/** Câu bắt buộc trên đề nghị thanh toán / phiếu thu (COMMERCE §5) — render tự chèn khi mẫu thiếu. */
export const NOT_VAT_LINE = {
  vi: 'Chứng từ này không thay thế hoá đơn giá trị gia tăng.',
  en: 'This document does not replace a VAT invoice.',
} as const;

const TAG = /\{\{\s*([#/@]?)\s*([a-z_][a-z0-9_.]*)\s*\}\}/gi;

/** Biến dùng trong thân mẫu: `vars` (ngoài vòng, gồm `items` nếu có vòng) + `unknown` (biến lạ / cột lạ / vòng không đóng). */
export function templateVars(kind: DocKind, body: string): { vars: string[]; unknown: string[] } {
  const vars = new Set<string>();
  const bad = new Set<string>();
  let inItems = 0;
  for (const m of body.matchAll(TAG)) {
    const [, sigil, raw] = m;
    const name = raw!.toLowerCase();
    if (sigil === '#' || sigil === '/') {
      if (name !== 'items') bad.add(name);
      else if (sigil === '#') {
        inItems++;
        vars.add('items');
      } else inItems = Math.max(0, inItems - 1);
      continue;
    }
    if (inItems > 0 && (ITEM_FIELDS as readonly string[]).includes(name)) continue;
    vars.add(name);
  }
  if (inItems > 0) bad.add('items');
  const list = [...vars];
  return { vars: list, unknown: [...new Set([...validateTemplateVars(kind, list), ...bad])] };
}

/** Bỏ thẻ HTML → chữ thường để kiểm nội dung. */
export const htmlText = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Mục kiểm đạt khi có một trong các biến, hoặc nội dung (không dấu) khớp mẫu chữ. */
const RULES: Record<string, { vars?: string[]; text?: RegExp }> = {
  parties: { vars: ['business.legal_name', 'customer.name'], text: /\bben a\b[\s\S]*\bben b\b/ },
  subject: { text: /doi tuong|pham vi|noi dung (cong viec|dich vu)|dich vu cung cap/ },
  quantity: { vars: ['items'], text: /so luong|chat luong/ },
  price_payment: { vars: ['contract.value', 'totals.total'], text: /gia tri hop dong|phuong thuc thanh toan/ },
  term_place: { vars: ['contract.start', 'contract.end'], text: /thoi han|dia diem/ },
  rights: { text: /quyen (va|,) nghia vu|nghia vu cua/ },
  breach: { text: /vi pham|boi thuong/ },
  dispute: { text: /tranh chap/ },
  effective: { vars: ['contract.start'], text: /hieu luc/ },
  seller_tax: { vars: ['business.tax_code'], text: /ma so thue|\bmst\b/ },
  date: { vars: ['doc.date'], text: /ngay lap|ngay \d/ },
  validity: { vars: ['doc.valid_until'], text: /hieu luc|co gia tri den/ },
  vat_note: { vars: ['totals.vat'], text: /vat|gtgt/ },
};

/** Bảng kiểm pháp lý (cảnh báo, không chặn — templates.md §6). `not_vat` luôn đạt: render tự chèn dòng khi thiếu. */
export function legalChecklist(kind: DocKind, text: string, vars: readonly string[]): { key: string; ok: boolean }[] {
  const t = foldText(text);
  return LEGAL_CHECKLIST[kind].map((key) => {
    if (key === 'not_vat') return { key, ok: true };
    const r = RULES[key] ?? {};
    return { key, ok: !!r.vars?.some((v) => vars.includes(v)) || !!r.text?.test(t) };
  });
}

/** Mẫu đề nghị thanh toán / phiếu thu đã có dòng "không thay thế hoá đơn GTGT" (vi hoặc en). */
export const hasNotVatLine = (kind: DocKind, text: string) =>
  !NOT_VAT_KINDS.includes(kind) || /khong thay the hoa don|does not replace a vat invoice/.test(foldText(text));
