// Nháp "Thông tin thêm" của form tạo / sửa (D56): giữ chuỗi nhập theo key, kiểm bằng validateCustomValues (cùng hàm với Executor)
// rồi trả phần `custom` để gửi kèm input action.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { validateCustomValues, type CustomFieldDef, type CustomFieldEntity, type CustomValues } from '@appchat/shared';
import { useAuthz } from '../authz/useCan';
import { customFieldDefsQuery, useCustomFields } from './api';
import { LIST_TYPES, customDiff, parseCustomInput } from './format';

export type RawValue = string | string[];

const toRaw = (f: CustomFieldDef, v: CustomValues[string] | undefined): RawValue => {
  if (f.type === 'multi') return Array.isArray(v) ? v : [];
  if (Array.isArray(v)) return v.join(', ');
  return v === undefined || v === null ? '' : String(v);
};

export interface CustomDraft {
  fields: CustomFieldDef[];
  raw: Record<string, RawValue>;
  errors: Record<string, string>;
  set: (key: string, v: RawValue) => void;
  /** Kiểm nháp; hợp lệ → `{ ok: true, custom }` (undefined khi không có gì để gửi), sai → hiện lỗi dưới từng ô. */
  collect: (mode: 'create' | 'update') => { ok: boolean; custom?: CustomValues };
  /** Lỗi `custom.<key>` từ server (422) → hiện dưới ô; trả true nếu có lỗi thuộc trường tuỳ biến. */
  absorb: (fields: Record<string, string> | undefined) => boolean;
}

export function useCustomDraft(entity: CustomFieldEntity, initial?: CustomValues): CustomDraft {
  const fields = useCustomFields(entity, 'form');
  const defs = useQuery(customFieldDefsQuery(entity)).data?.data ?? [];
  const role = useAuthz().data?.role ?? 'owner';
  const [edits, setEdits] = useState<Record<string, RawValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const raw = Object.fromEntries(fields.map((f) => [f.key, edits[f.key] ?? toRaw(f, initial?.[f.key])]));

  const set = (key: string, v: RawValue) => {
    setEdits((x) => ({ ...x, [key]: v }));
    setErrors(({ [key]: _, ...rest }) => rest);
  };

  const collect = (mode: 'create' | 'update') => {
    const next = Object.fromEntries(fields.map((f) => [f.key, parseCustomInput(f, raw[f.key] ?? (LIST_TYPES.has(f.type) ? [] : ''))]));
    const custom = customDiff(initial, next, mode);
    const errs = validateCustomValues(defs, custom, role, mode);
    const shown = Object.fromEntries(Object.entries(errs).map(([k, v]) => [k.replace(/^custom\./, ''), v]));
    setErrors(shown);
    return Object.keys(shown).length ? { ok: false } : { ok: true, custom };
  };

  const absorb = (server: Record<string, string> | undefined) => {
    const mine = Object.fromEntries(Object.entries(server ?? {}).filter(([k]) => k.startsWith('custom.')).map(([k, v]) => [k.slice(7), v]));
    setErrors(mine);
    return Object.keys(mine).length > 0;
  };

  return { fields, raw, errors, set, collect, absorb };
}
