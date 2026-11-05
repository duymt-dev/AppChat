// Chiếu DTO theo quyền trường (TIP-045b annex C): bỏ HẲN key tuỳ biến bị ẩn / đã xoá (không thay bằng 0 / rỗng) và trường hệ thống bị
// ẩn (đánh dấu `hidden_fields` để FE hiện "không có quyền", không tự tính tổng). Dữ liệu lưu trong DB giữ nguyên — chỉ chiếu khi trả.
import type { CustomValues } from '@appchat/shared';
import type { FieldView } from './types';

/** `custom` chỉ còn key được thấy. */
export function projectCustom(v: FieldView, custom: unknown): CustomValues {
  const src = (custom && typeof custom === 'object' ? custom : {}) as CustomValues;
  const out: CustomValues = {};
  for (const [k, x] of Object.entries(src)) if (v.custom.has(k)) out[k] = x;
  return out;
}

/** Bỏ trường hệ thống bị ẩn khỏi DTO + ghi `hidden_fields` (rỗng → không thêm khoá). */
export function projectRow<T extends Record<string, unknown>>(v: FieldView, row: T): T & { hidden_fields?: string[] } {
  const out: Record<string, unknown> = { ...row };
  if ('custom' in out) out.custom = projectCustom(v, out.custom);
  const hidden: string[] = [];
  for (const f of v.hiddenSystem) if (f in out) {
    delete out[f];
    hidden.push(f);
  }
  if (hidden.length) out.hidden_fields = hidden;
  return out as T & { hidden_fields?: string[] };
}
