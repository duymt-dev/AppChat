// Định dạng giá trị ref theo `format` của khối (standard §3: tiền / ngày / số ở renderer bằng fmt.*, model không định dạng).
import { readRef, type Fmt, type ValueFormat } from '@appchat/shared';

export function formatValue(fmt: Fmt, v: unknown, f: ValueFormat = 'text'): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  switch (f) {
    case 'number':
      return Number.isFinite(n) ? fmt.number(n) : String(v);
    case 'money':
      return Number.isFinite(n) ? fmt.money(n) : String(v);
    case 'percent':
      return Number.isFinite(n) ? `${fmt.number(n)}%` : String(v);
    case 'date':
      return Number.isNaN(Date.parse(String(v))) ? String(v) : fmt.date(String(v));
    case 'datetime':
      return Number.isNaN(Date.parse(String(v))) ? String(v) : `${fmt.date(String(v))} ${fmt.time(String(v))}`;
    default:
      return String(v);
  }
}

/** Mảng các object (bảng / danh sách / biểu đồ) — giá trị khác → rỗng. */
export const rowsOf = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)) : []);

/**
 * Đọc giá trị ref từ bản đồ refs server phát: khoá là chuỗi ref đầy đủ; thiếu thì đọc theo output cả bước (`step:<n>`) — fixture / mock
 * phát theo bước. Không có → `undefined` (renderer hiện "Không có dữ liệu").
 */
export function refReader(refs: Record<string, unknown>) {
  const steps = new Map<number, unknown>();
  for (const [k, v] of Object.entries(refs)) {
    const hit = /^step:(\d{1,3})$/.exec(k);
    if (hit) steps.set(Number(hit[1]), v);
  }
  return (r: { $ref: string } | undefined): unknown => (r ? (Object.prototype.hasOwnProperty.call(refs, r.$ref) ? refs[r.$ref] : readRef(steps, r.$ref)) : undefined);
}
