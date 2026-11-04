// Che PII cho tri thức dùng chung (TIP-043, rag §9): khác `PiiMasker` của lượt trả lời khách (che rồi khôi phục được), ở đây KHÔNG có bảng
// khôi phục — dữ liệu khách bị thay bằng nhãn chung vĩnh viễn trước khi gửi model, sau output model và sau khi người duyệt sửa.
// Che: CCCD / thẻ / STK (tái dùng quy tắc PiiMasker), email, số điện thoại VN (0… / +84…, có dấu cách / chấm / gạch), tên và địa chỉ khách
// lấy từ hồ sơ hội thoại. Regex không che được mọi PII: `sensitiveLeft` báo còn dấu vết (số dài, email, @) → caller bỏ cặp / chặn duyệt.
import { PiiMasker } from '../reply/pii';

export const KB_LABELS = {
  vi: { phone: '[số điện thoại]', email: '[email]', name: '[tên khách]', address: '[địa chỉ]', secret: '[thông tin riêng]' },
  en: { phone: '[phone number]', email: '[email]', name: '[customer name]', address: '[address]', secret: '[private data]' },
} as const;
export type KbLabelLocale = keyof typeof KB_LABELS;

export interface KnowledgeContext {
  /** Tên / biệt danh khách (hồ sơ + tên người gửi) — mỗi mục ≥ 2 ký tự mới thay. */
  names?: readonly (string | null | undefined)[];
  addresses?: readonly (string | null | undefined)[];
  locale?: string;
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const PHONE = /(?<![\p{N}])(?:\+?84|0)(?:[\s.-]?\d){8,10}(?![\p{N}])/gu;
const MASKED = /\[PII_\d+\]/g;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fold = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ');

/** Mẫu khớp tên / địa chỉ theo ranh giới chữ — đúng chữ (có dấu), không phân biệt hoa thường; chuỗi dài thử trước. */
function wordPattern(values: readonly (string | null | undefined)[]): RegExp | null {
  const parts = [...new Set(values.map((v) => fold(v ?? '')).filter((v) => v.length >= 2))].sort((a, b) => b.length - a.length);
  if (!parts.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

/** Tên đầy đủ + từng thành phần ≥ 3 ký tự sau họ (vd "Nguyễn Thị Lan" → "Thị Lan", "Lan") — khách hay được gọi bằng tên. */
export function nameVariants(name: string | null | undefined): string[] {
  const n = fold(name ?? '');
  if (!n) return [];
  const w = n.split(' ');
  const out = new Set([n]);
  for (let i = 1; i < w.length; i++) out.add(w.slice(i).join(' '));
  return [...out].filter((x) => x.length >= 3);
}

export function redactForKnowledge(text: string, ctx: KnowledgeContext = {}): string {
  const L = KB_LABELS[ctx.locale === 'en' ? 'en' : 'vi'];
  // Số giấy tờ / thẻ / STK: dùng quy tắc của PiiMasker rồi thay mã bằng nhãn chung — bảng ánh xạ bị bỏ, không lưu ở đâu.
  let out = new PiiMasker().mask(text).replace(MASKED, L.secret);
  out = out.replace(EMAIL, L.email).replace(PHONE, L.phone);
  const addr = wordPattern(ctx.addresses ?? []);
  if (addr) out = out.replace(addr, L.address);
  const names = wordPattern((ctx.names ?? []).flatMap((n) => nameVariants(n)));
  if (names) out = out.replace(names, L.name);
  return out;
}

const LONG_DIGITS = /(?<!\d)\d(?:[\s.-]?\d){8,}(?!\d)/u;

/** Còn dấu vết dữ liệu riêng sau khi che (số ≥ 9 chữ số, email, @handle, mã [PII_n]) → không đưa vào kho. */
export function sensitiveLeft(text: string, ctx: KnowledgeContext = {}): string | null {
  if (/\[PII_\d+\]/.test(text)) return 'masked_token';
  if (new RegExp(EMAIL.source, 'u').test(text)) return 'email';
  if (new RegExp(PHONE.source, 'u').test(text)) return 'phone';
  if (LONG_DIGITS.test(text)) return 'long_number';
  if (/(?<![\p{L}\p{N}])@[\p{L}\p{N}_.]{3,}/u.test(text)) return 'handle';
  const names = wordPattern((ctx.names ?? []).flatMap((n) => nameVariants(n)));
  if (names && new RegExp(names.source, 'iu').test(text)) return 'name';
  const addr = wordPattern(ctx.addresses ?? []);
  if (addr && new RegExp(addr.source, 'iu').test(text)) return 'address';
  return null;
}
