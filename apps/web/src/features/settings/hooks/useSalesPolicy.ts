// Chính sách bán hàng (TIP-032b P1): đọc ngưỡng duyệt + nháp form, lưu bằng `sales_settings.update` kèm `if_version` (CAS — 409 STALE_VERSION
// do useAction báo lỗi, query làm mới). Chỉ gửi trường đã đổi; ngưỡng tiền nhập số nguyên VND (chuỗi chữ số, server kiểm lại).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAction } from '@/shared/actions/useAction';
import { salesPolicyQuery } from '../api';

export interface SalesPolicyDraft {
  total: string;
  pct: string;
}

const digits = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);

export function useSalesPolicy() {
  const q = useQuery(salesPolicyQuery());
  const save = useAction('sales_settings.update');
  // Nháp gắn với version đang sửa — server đổi version (lưu xong / người khác lưu) thì nháp cũ tự bỏ, form hiện giá trị mới.
  const [edit, setEdit] = useState<(SalesPolicyDraft & { version: number }) | null>(null);
  const p = q.data;
  const base: SalesPolicyDraft = p ? { total: p.approval_total_vnd, pct: String(p.approval_discount_pct) } : { total: '', pct: '' };
  const draft = edit && p && edit.version === p.version ? edit : base;
  const patch = (k: keyof SalesPolicyDraft, v: string) => p && setEdit({ ...draft, [k]: v, version: p.version });
  const pct = Number(draft.pct);
  const valid = draft.total !== '' && draft.pct !== '' && Number.isInteger(pct) && pct >= 0 && pct <= 100;
  const dirty = !!p && (draft.total !== p.approval_total_vnd || draft.pct !== String(p.approval_discount_pct));
  const submit = async () => {
    if (!p || !valid || !dirty) return;
    await save.run({
      if_version: p.version,
      ...(draft.total !== p.approval_total_vnd ? { approval_total_vnd: draft.total } : {}),
      ...(draft.pct !== String(p.approval_discount_pct) ? { approval_discount_pct: pct } : {}),
    });
  };
  return {
    q,
    draft,
    setTotal: (v: string) => patch('total', digits(v)),
    setPct: (v: string) => patch('pct', digits(v).slice(0, 3)),
    reset: () => setEdit(null),
    valid,
    dirty,
    saving: save.isPending,
    submit,
  };
}
