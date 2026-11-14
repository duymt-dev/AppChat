// Bộ dựng preview dùng chung (TIP-023b R2.8): helper preview từng domain (`<domain>/…/previews/*.preview.ts`) chỉ đọc dữ liệu người gọi được
// phép thấy rồi dựng `ActionPreview` canonical — `summary` là dữ liệu (tên / mã / số tiền), không câu chữ; thẻ xác nhận ghép tiêu đề đã dịch
// theo ActionDef (DC-128). Không ghi DB, không gọi provider, không trừ Credit.
import type { ActionPreview, Risk } from '@appchat/actions';

type Fields = Record<string, unknown>;
export type Change = NonNullable<ActionPreview['changes']>[number];

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Trường đổi thật: chỉ khoá `patch` có giá trị và khác `cur` → `{ before, after }`; không đổi gì → null. */
export function diff(cur: Fields, patch: Fields): { before: Fields; after: Fields } | null {
  const before: Fields = {};
  const after: Fields = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || same(cur[k], v)) continue;
    before[k] = cur[k] ?? null;
    after[k] = v;
  }
  return Object.keys(after).length ? { before, after } : null;
}

/** Bỏ khoá undefined (input tuỳ chọn) để `after` chỉ chứa giá trị người dùng đưa. */
export const defined = (o: Fields): Fields => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Nối các mẩu tóm tắt không rỗng: `BG-1001 · Chị Lan · 1.500.000 ₫`. */
export const line = (...parts: (string | number | null | undefined | false)[]) => parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '').join(' · ');

export const created = (entity: string, after: Fields, id?: string): Change => ({ entity, ...(id ? { id } : {}), after: defined(after) });
export const removed = (entity: string, id: string, before: Fields): Change => ({ entity, id, before });

/** Sửa một bản ghi: `changes` có một dòng before/after (hoặc rỗng khi không đổi gì → cảnh báo từ thẻ). */
export function updated(entity: string, id: string, cur: Fields, patch: Fields): Change[] {
  const d = diff(cur, patch);
  return d ? [{ entity, id, ...d }] : [];
}

export function preview(risk: Risk, summary: string, more: Omit<ActionPreview, 'risk' | 'summary'> = {}): ActionPreview {
  return { summary, risk, ...defined(more as Fields) } as ActionPreview;
}
