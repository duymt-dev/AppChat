// Chuẩn hoá số điện thoại cho `contact.phone_norm` (chống trùng / chống giành khách — D32, C06) — dùng chung FE mock + BE.
// VN: bỏ ký tự không phải số, `84` / `+84` đầu → `0`. Số quốc tế khác giữ nguyên chữ số có `+`.

/** "+84 909 123 456" → "0909123456"; "0909.123.456" → "0909123456"; "+1 415 882 4421" → "+14158824421"; rỗng → null. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const digits = s.replace(/\D/g, '');
  if (digits.length < 6) return null;
  if (digits.startsWith('84') && (s.startsWith('+') || digits.length === 11)) return `0${digits.slice(2)}`;
  if (s.startsWith('+')) return `+${digits}`;
  return digits;
}

/** Chuỗi so khớp không dấu / không phân biệt hoa thường (tìm kiếm, trùng tên thẻ / nhãn trường). */
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

/** Khoá snake_case từ nhãn tiếng Việt (custom field) — "Size áo" → "size_ao"; bắt đầu bằng chữ, ≤ 40 ký tự. */
export function keyFromLabel(label: string): string {
  const k = foldText(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const base = /^[a-z]/.test(k) ? k : `f_${k}`;
  return base.slice(0, 40).replace(/_+$/, '') || 'field';
}
