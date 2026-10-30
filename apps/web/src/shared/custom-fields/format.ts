// Hiển thị / chuyển đổi giá trị trường tuỳ biến (D56): tiền qua fmt.money, ngày qua fmt.date, danh sách nối "·".
import type { CustomFieldDef, CustomValue, CustomValues, Fmt } from '@appchat/shared';

const LIST_SEP = ' · ';
export const LIST_TYPES = new Set(['multi', 'tags']);
export const CHOICE_TYPES = new Set(['picklist', 'tier']);

export function formatCustomValue(f: CustomFieldDef, v: CustomValue | undefined, fmt: Fmt): string {
  if (v === undefined || v === null || v === '') return '';
  if (Array.isArray(v)) return v.join(LIST_SEP);
  if (f.type === 'currency') return fmt.money(v);
  if (f.type === 'number') return fmt.number(v);
  if (f.type === 'date' && typeof v === 'string') return fmt.date(v);
  return String(v);
}

/** Chuỗi trong ô nhập → giá trị lưu (number = number, multi / tags = string[], còn lại string). Rỗng = null (xoá). */
export function parseCustomInput(f: CustomFieldDef, raw: string | string[]): CustomValue {
  if (Array.isArray(raw)) return raw.length ? raw : null;
  const s = raw.trim();
  if (!s) return null;
  if (f.type === 'number') return Number.isFinite(Number(s)) ? Number(s) : s;
  if (f.type === 'currency') return s.replace(/\D/g, '');
  if (LIST_TYPES.has(f.type)) return s.split(',').map((x) => x.trim()).filter(Boolean);
  return s;
}

/** Bỏ key không đổi so với giá trị cũ — `update` chỉ gửi phần đã sửa; `create` bỏ giá trị rỗng. */
export function customDiff(cur: CustomValues | undefined, next: CustomValues, mode: 'create' | 'update'): CustomValues | undefined {
  const out: CustomValues = {};
  for (const [k, v] of Object.entries(next)) {
    if (mode === 'create' && v === null) continue;
    if (JSON.stringify(cur?.[k] ?? null) !== JSON.stringify(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
