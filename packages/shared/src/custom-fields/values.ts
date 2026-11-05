// Trường dữ liệu tuỳ biến (D56, standards/domain/custom-fields.md): định nghĩa + kiểm giá trị — hàm thuần dùng chung FE mock và BE.
import { z } from 'zod';

export const CUSTOM_FIELD_ENTITIES = ['contact', 'product', 'quote', 'order', 'ticket', 'appointment'] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export const CUSTOM_FIELD_PLACES = ['list', 'kanban', 'form', 'filter', 'detail', 'export'] as const;
export type CustomFieldPlace = (typeof CUSTOM_FIELD_PLACES)[number];

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'email' | 'phone' | 'picklist' | 'multi' | 'tier' | 'tags' | 'lookup' | 'file';

export interface CustomFieldDef {
  key: string;
  label: string;
  type: CustomFieldType | string;
  /** Lựa chọn của picklist / multi / tier, ngăn cách bằng "/". */
  options: string;
  required: boolean;
  ai: boolean;
  sys: boolean;
  visible_in: Record<CustomFieldPlace, boolean>;
  /** Rỗng = mọi vai trò. */
  roles: string[];
  condition: string;
}

export type CustomValue = string | number | string[] | null;
export type CustomValues = Record<string, CustomValue>;

/** Phần `custom` trong input create / update — kiểm chi tiết theo định nghĩa bằng `validateCustomValues`. */
export const customValuesSchema = z.record(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), z.union([z.string().max(2000), z.number(), z.array(z.string().max(120)).max(30), z.null()]));

const SEP = /\s*\/\s*/;
export const fieldOptions = (f: Pick<CustomFieldDef, 'options'>) => f.options.split(SEP).map((s) => s.trim()).filter(Boolean);

const CHOICE = new Set(['picklist', 'tier']);
const LIST = new Set(['multi', 'tags']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONEY = /^\d+$/;

/**
 * Vai trò trường của agent trực kênh không có người ra lệnh (TIP-045b annex C): chỉ trường `ai = true` và KHÔNG giới hạn vai trò — không
 * bao giờ suy ra quyền Owner.
 */
export const AGENT_FIELD_ROLE = 'agent';

/** Trường tuỳ biến (không hệ thống) người có `role` được thấy / sửa. `agent` → chỉ trường AI không giới hạn vai trò. */
export const fieldsForRole = (defs: CustomFieldDef[], role: string) =>
  role === AGENT_FIELD_ROLE ? defs.filter((f) => !f.sys && f.ai && !f.roles.length) : defs.filter((f) => !f.sys && (!f.roles.length || f.roles.includes(role)));

/** Vai trò trường hiện hành của một AuthzContext: Owner → `owner`; có membership → vai trò; thiếu → `agent` (fail closed). */
export const fieldRoleOf = (a: { isOwner: boolean; roleKey?: string }) => (a.isOwner ? 'owner' : (a.roleKey ?? AGENT_FIELD_ROLE));

const empty = (v: CustomValue | undefined) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

function checkOne(f: CustomFieldDef, v: CustomValue): string | null {
  if (v === null) return null;
  if (f.type === 'number') return typeof v === 'number' && Number.isFinite(v) ? null : 'number';
  if (f.type === 'currency') return typeof v === 'string' && MONEY.test(v) ? null : 'money';
  if (LIST.has(f.type)) {
    if (!Array.isArray(v)) return 'list';
    const opts = fieldOptions(f);
    return f.type === 'multi' && opts.length && v.some((x) => !opts.includes(x)) ? 'option' : null;
  }
  if (typeof v !== 'string') return 'text';
  if (f.type === 'date') return ISO_DATE.test(v) ? null : 'date';
  if (f.type === 'email') return EMAIL.test(v) ? null : 'email';
  if (CHOICE.has(f.type)) return fieldOptions(f).includes(v) ? null : 'option';
  return null;
}

/**
 * Kiểm `custom` theo định nghĩa hiện hành. Trả map lỗi `custom.<key>` → mã (rỗng = hợp lệ).
 * `mode: 'create'` bắt buộc đủ trường `required`; `update` chỉ kiểm key được gửi.
 */
export function validateCustomValues(defs: CustomFieldDef[], values: CustomValues | undefined, role: string, mode: 'create' | 'update'): Record<string, string> {
  const errors: Record<string, string> = {};
  const allowed = new Map(fieldsForRole(defs, role).map((f) => [f.key, f]));
  for (const [key, v] of Object.entries(values ?? {})) {
    const f = allowed.get(key);
    if (!f) {
      errors[`custom.${key}`] = defs.some((d) => d.key === key && !d.sys) ? 'forbidden' : 'unknown';
      continue;
    }
    const code = checkOne(f, v);
    if (code) errors[`custom.${key}`] = code;
    else if (f.required && empty(v)) errors[`custom.${key}`] = 'required';
  }
  if (mode === 'create')
    for (const f of allowed.values()) if (f.required && empty(values?.[f.key]) && !errors[`custom.${f.key}`]) errors[`custom.${f.key}`] = 'required';
  return errors;
}

/** Gộp `update` vào giá trị cũ: `null` xoá key. */
export function mergeCustomValues(cur: CustomValues | undefined, patch: CustomValues | undefined): CustomValues {
  const out: CustomValues = { ...cur };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

/** Lọc bản ghi theo giá trị trường tuỳ biến: lựa chọn = bằng / chứa phần tử; chữ = chứa (không phân biệt hoa thường). */
export function matchCustomFilter(defs: CustomFieldDef[], values: CustomValues | undefined, filter: Record<string, string>): boolean {
  return Object.entries(filter).every(([key, want]) => {
    if (!want) return true;
    const f = defs.find((d) => d.key === key);
    const v = values?.[key];
    if (!f || v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.includes(want);
    if (CHOICE.has(f.type)) return String(v) === want;
    return String(v).toLowerCase().includes(want.toLowerCase());
  });
}
