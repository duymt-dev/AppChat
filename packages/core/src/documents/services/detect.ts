// AI nhận diện vị trí → biến trong mẫu Word của DN (templates.md §4, `doc_template.detect_fields`). Model đọc danh sách đoạn văn và
// trả JSON `{ fields: [{ placeholder, variable, confidence }] }`; chỉ giữ vị trí có thật trong tệp + biến có trong registry của loại.
// Model không chạy / trả sai định dạng (model giả, lỗi mạng) → bộ luật tất định theo nhãn tiếng Việt quen dùng ("Kính gửi", "BÊN B"…),
// vẫn qua bước người xác nhận như bản AI.
import { z } from 'zod';
import { foldText, varsForKind, type DocKind } from '@appchat/shared';

export interface DetectedField {
  placeholder: string;
  variable: string;
  confidence: number;
}

const MAX_PARAS = 400;
const MAX_LEN = 300;

export function detectPrompt(kind: DocKind, paras: readonly string[]): { system: string; prompt: string } {
  const vars = varsForKind(kind).map((v) => v.key);
  return {
    system: [
      '# DOC FIELD DETECT',
      'Bạn đọc nội dung một mẫu chứng từ Word của doanh nghiệp Việt Nam và tìm các vị trí cần điền dữ liệu (chỗ trống "……", "____", nhãn chờ điền).',
      `Loại chứng từ: ${kind}. Chỉ dùng các biến: ${vars.join(', ')}. Bảng / danh sách hàng hoá → biến "items".`,
      'Không đề xuất điền số tiền cố định; không sửa điều khoản. "placeholder" phải là đoạn chữ NGUYÊN VĂN có trong một dòng của tài liệu.',
      'Chỉ trả về MỘT khối JSON: {"fields":[{"placeholder":string,"variable":string,"confidence":number 0..1}]}',
    ].join('\n'),
    prompt: paras
      .slice(0, MAX_PARAS)
      .map((p, i) => `${i + 1}. ${p.slice(0, MAX_LEN)}`)
      .join('\n'),
  };
}

const outSchema = z.object({ fields: z.array(z.object({ placeholder: z.string().min(1), variable: z.string().min(1), confidence: z.number().min(0).max(1).catch(0.5) })) });

function firstJson(text: string): unknown {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
}

/** Kết quả model → vị trí hợp lệ (có trong tệp, biến đúng loại, không trùng vị trí). null = không dùng được → bộ luật. */
export function parseDetected(kind: DocKind, paras: readonly string[], text: string): DetectedField[] | null {
  const r = outSchema.safeParse(firstJson(text));
  if (!r.success) return null;
  const allowed = new Set(varsForKind(kind).map((v) => v.key));
  const seen = new Set<string>();
  const out = r.data.fields.filter((f) => {
    const ph = f.placeholder.trim();
    if (!allowed.has(f.variable) || seen.has(ph) || !paras.some((p) => p.includes(ph))) return false;
    seen.add(ph);
    return true;
  });
  return out.length ? out.map((f) => ({ placeholder: f.placeholder.trim(), variable: f.variable, confidence: Math.round(f.confidence * 100) / 100 })) : null;
}

/** Nhãn (không dấu) → biến. Thứ tự quan trọng: nhãn cụ thể trước nhãn chung. */
const RULES: { re: RegExp; variable: string; confidence: number }[] = [
  { re: /^ben a\b|^ben ban\b|^ben cung (cap|ung)/, variable: 'business.legal_name', confidence: 0.9 },
  { re: /^ben b\b|^ben mua\b|^ben thue\b|^khach hang\s*:|^kinh gui|^ho (va )?ten nguoi nop/, variable: 'customer.name', confidence: 0.9 },
  { re: /ma so thue|^mst\b/, variable: 'customer.tax_code', confidence: 0.75 },
  { re: /^dia chi/, variable: 'customer.address', confidence: 0.7 },
  { re: /dien thoai|^sdt\b/, variable: 'customer.phone', confidence: 0.7 },
  { re: /^email/, variable: 'customer.email', confidence: 0.7 },
  { re: /^dai dien/, variable: 'customer.representative', confidence: 0.65 },
  { re: /^so\s*:|so (bao gia|hop dong|phieu)/, variable: 'doc.code', confidence: 0.85 },
  { re: /^ngay\b.*(lap|thang)|^ngay\s*:/, variable: 'doc.date', confidence: 0.7 },
  { re: /hieu luc den|co gia tri den|han thanh toan/, variable: 'doc.valid_until', confidence: 0.7 },
  { re: /gia tri hop dong/, variable: 'contract.value', confidence: 0.9 },
  { re: /thoi han.*tu|^tu ngay/, variable: 'contract.start', confidence: 0.6 },
  { re: /den ngay/, variable: 'contract.end', confidence: 0.6 },
  { re: /bang chu/, variable: 'totals.total_words', confidence: 0.85 },
  { re: /tong cong|tong tien|so tien/, variable: 'totals.total', confidence: 0.85 },
  { re: /thue gtgt|tien thue|\bvat\b/, variable: 'totals.vat', confidence: 0.6 },
  { re: /noi dung (chuyen khoan|ck)/, variable: 'payment.transfer_note', confidence: 0.8 },
  { re: /ma qr|vietqr/, variable: 'payment.vietqr', confidence: 0.75 },
  { re: /bang (hang hoa|dich vu|bao gia)|danh muc (hang|dich vu)/, variable: 'items', confidence: 0.7 },
];

const BLANK = /[.…_]{2,}|…/;

/** Bộ luật tất định: đoạn có nhãn quen + chỗ trống (hoặc tiêu đề bảng hàng) → biến. */
export function detectByRules(kind: DocKind, paras: readonly string[]): DetectedField[] {
  const allowed = new Set(varsForKind(kind).map((v) => v.key));
  const used = new Set<string>();
  const out: DetectedField[] = [];
  for (const p of paras) {
    const f = foldText(p);
    const rule = RULES.find((r) => r.re.test(f) && allowed.has(r.variable) && (r.variable === 'items' || BLANK.test(p)));
    if (!rule) continue;
    // Biến khách / tổng xuất hiện một lần là đủ (dòng lặp lại — chữ ký, chân trang — không gán lần hai).
    if (used.has(rule.variable) && rule.variable !== 'contract.start') continue;
    used.add(rule.variable);
    out.push({ placeholder: p.slice(0, 80), variable: rule.variable, confidence: rule.confidence });
  }
  return out;
}
