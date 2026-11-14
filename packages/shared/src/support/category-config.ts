// Từ điển gợi ý danh mục ticket (TIP-034b §1): một bộ nhãn có thứ tự cho mỗi workspace — CHỈ là gợi ý, ticket vẫn nhận danh mục tự do
// và nhãn cũ không bị sửa. Chưa cấu hình → bản ảo version 0 = 8 nhãn prototype. Validator thuần dùng chung action / mock / adapter tệp / UI:
// NFC + trim, 1–60 code point, không ký tự điều khiển / xuống dòng, 1–100 nhãn, trùng theo khoá chuẩn hoá không phân biệt hoa thường
// (khác dấu là hai nhãn). Nhãn đầu danh sách là mặc định cho form tạo mới.
import { TICKET_CATEGORIES } from './ticket-state';

export const CATEGORY_LABEL_MAX = 60;
export const CATEGORY_LABELS_MAX = 100;
export const CATEGORY_CONFIG_KEY = 'ticket_categories';
export const DEFAULT_CATEGORY_LABELS: readonly string[] = TICKET_CATEGORIES;

export type CategoryLabelError = 'empty' | 'too_long' | 'control' | 'duplicate';
export interface CategoryValidation {
  labels: string[];
  /** Lỗi theo vị trí nhãn (0-based) — rỗng = hợp lệ. `list` = lỗi của cả danh sách (rỗng / quá 100). */
  errors: { index: number; code: CategoryLabelError }[];
  list?: 'empty' | 'too_many';
}

const CONTROL = new RegExp('[\u0000-\u001F\u007F-\u009F\u2028\u2029]', 'u');

/** NFC + trim (giữ nguyên chữ hoa / dấu). */
export const normalizeCategoryLabel = (s: string): string => s.normalize('NFC').trim();

/** Khoá so trùng: NFC + trim + chữ thường theo locale trung lập (giữ dấu — "Hoàn tiền" ≠ "Hoan tien"). */
export const categoryKey = (s: string): string => normalizeCategoryLabel(s).toLowerCase();

/** Số code point (không phải UTF-16) — giới hạn 60 tính theo ký tự người thấy. */
export const codePoints = (s: string): number => [...s].length;

export function labelError(raw: string): Exclude<CategoryLabelError, 'duplicate'> | null {
  const s = normalizeCategoryLabel(raw);
  if (!s) return 'empty';
  if (CONTROL.test(s)) return 'control';
  if (codePoints(s) > CATEGORY_LABEL_MAX) return 'too_long';
  return null;
}

/** Chuẩn hoá + kiểm cả bộ. Lỗi trùng chỉ đánh ở lần xuất hiện sau. */
export function validateCategoryLabels(raw: readonly string[]): CategoryValidation {
  const labels = raw.map(normalizeCategoryLabel);
  const errors: CategoryValidation['errors'] = [];
  const seen = new Set<string>();
  labels.forEach((l, index) => {
    const e = labelError(l);
    if (e) {
      errors.push({ index, code: e });
      return;
    }
    const k = categoryKey(l);
    if (seen.has(k)) errors.push({ index, code: 'duplicate' });
    seen.add(k);
  });
  const list = !labels.length ? 'empty' : labels.length > CATEGORY_LABELS_MAX ? 'too_many' : undefined;
  return { labels, errors, ...(list ? { list } : {}) };
}

export const isValidCategoryConfig = (v: CategoryValidation): boolean => !v.errors.length && !v.list;

/** Lỗi theo trường của envelope API (`labels.<i>` / `labels`). */
export function categoryFieldErrors(v: CategoryValidation): Record<string, string> {
  const out: Record<string, string> = {};
  if (v.list) out.labels = v.list;
  for (const e of v.errors) out[`labels.${e.index}`] = e.code;
  return out;
}

/** Khác biệt giữa hai bộ (preview): thêm / bớt theo khoá chuẩn hoá; đổi tên = bớt + thêm; `reordered` = các nhãn giữ lại đổi thứ tự;
 *  mặc định đổi khi nhãn đầu khác. */
export function diffCategoryLabels(before: readonly string[], after: readonly string[]) {
  const b = new Set(before.map(categoryKey));
  const a = new Set(after.map(categoryKey));
  const keptBefore = before.map(categoryKey).filter((k) => a.has(k));
  const keptAfter = after.map(categoryKey).filter((k) => b.has(k));
  return {
    added: after.filter((l) => !b.has(categoryKey(l))),
    removed: before.filter((l) => !a.has(categoryKey(l))),
    reordered: keptBefore.some((k, i) => k !== keptAfter[i]),
    default_changed: categoryKey(before[0] ?? '') !== categoryKey(after[0] ?? ''),
  };
}
