// Kiểm + chuẩn hoá dòng nhập tất định (TIP-038b, DC-374): theo kiểu trường registry — bắt buộc / độ dài / email / SĐT (giữ số 0 đầu,
// chuẩn `normalizePhone`) / tiền VND (chuỗi chữ số, bỏ dấu nghìn) / số / ngày (dd/mm/yyyy | yyyy-mm-dd → yyyy-mm-dd) / enum. Model KHÔNG
// sửa giá trị: sai → mã lỗi theo trường, không tự điền / đoán. Ô bắt đầu `= + - @` giữ nguyên chữ (không công thức).
import {
  AppError,
  normalizePhone,
  transferSpec,
  type TransferEntity,
  type TransferField,
} from '@appchat/shared';

export type FieldError = 'required' | 'too_long' | 'invalid' | 'option';
export interface CheckedRow {
  rowNo: number;
  data: Record<string, string>;
  errors: Record<string, FieldError>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function date(v: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const vn = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : vn ? [vn[3], vn[2], vn[1]] : [];
  if (!y) return null;
  const t = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (t.getUTCMonth() !== Number(m) - 1 || t.getUTCDate() !== Number(d)) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Một ô → giá trị chuẩn hoá hoặc lỗi. Rỗng trả `null` (không lỗi trừ khi bắt buộc — kiểm ở `checkRow`). */
export function normalizeCell(
  f: TransferField,
  raw: string,
): { value: string | null } | { error: FieldError } {
  const v = raw.trim();
  if (!v) return { value: null };
  if (f.max && v.length > f.max) return { error: 'too_long' };
  switch (f.type) {
    case 'text':
      return { value: v };
    case 'phone': {
      const p = normalizePhone(v);
      return p ? { value: p } : { error: 'invalid' };
    }
    case 'email':
      return EMAIL.test(v.toLowerCase()) ? { value: v.toLowerCase() } : { error: 'invalid' };
    case 'money': {
      const digits = v.replace(/[.,\s₫đ]|vnd/gi, '');
      return /^\d{1,15}$/.test(digits) ? { value: String(BigInt(digits)) } : { error: 'invalid' };
    }
    case 'number':
      return /^-?\d+(?:[.,]\d+)?$/.test(v) ? { value: v.replace(',', '.') } : { error: 'invalid' };
    case 'date': {
      const d = date(v);
      return d ? { value: d } : { error: 'invalid' };
    }
    case 'enum':
      return f.options?.includes(v) ? { value: v } : { error: 'option' };
  }
}

/** Ánh xạ (trường → tên cột) phải trỏ cột có thật và trường có trong registry — sai → 422 theo trường. */
export function resolveMapping(
  entity: TransferEntity,
  columns: readonly string[],
  mapping: Record<string, string>,
): [TransferField, number][] {
  const spec = transferSpec(entity);
  const out: [TransferField, number][] = [];
  const fields: Record<string, string> = {};
  for (const [key, col] of Object.entries(mapping)) {
    const f = spec.fields.find((x) => x.key === key);
    const i = columns.indexOf(col);
    if (!f) fields[`mapping.${key}`] = 'unknown_field';
    else if (i < 0) fields[`mapping.${key}`] = 'column_not_found';
    else out.push([f, i]);
  }
  if (Object.keys(fields).length) throw new AppError('VALIDATION_FAILED', 422, fields);
  return out;
}

/** Một dòng nguồn → dữ liệu chuẩn hoá + lỗi theo trường (thiếu trường bắt buộc chưa ánh xạ cũng là `required`). */
export function checkRow(
  entity: TransferEntity,
  cols: [TransferField, number][],
  cells: string[],
  rowNo: number,
): CheckedRow {
  const data: Record<string, string> = {};
  const errors: Record<string, FieldError> = {};
  for (const [f, i] of cols) {
    const r = normalizeCell(f, cells[i] ?? '');
    if ('error' in r) errors[f.key] = r.error;
    else if (r.value !== null) data[f.key] = r.value;
  }
  for (const f of transferSpec(entity).fields)
    if (f.required && !data[f.key] && !errors[f.key]) errors[f.key] = 'required';
  return { rowNo, data, errors };
}
