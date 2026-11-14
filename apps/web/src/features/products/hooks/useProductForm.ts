// State form thêm / sửa sản phẩm — prototype L9111–9147: loại quyết định khối nhập riêng, thuộc tính sinh biến thể.
'use client';
import { useMemo, useState } from 'react';
import { isFieldHidden } from '@appchat/shared';
import type { Product, ProductType } from '../types';

export interface Row {
  name: string;
  value: string;
}

export interface ProductDraft {
  name: string;
  type: ProductType;
  category: string;
  price: string;
  status: 'active' | 'draft';
  channel: string;
  description: string;
  sku: string;
  stock: string;
  cost: string;
  duration: string;
  staff: string;
  sessions: string;
  validMonths: string;
  perSession: string;
  grantOnDeposit: boolean;
  rentUnit: 'hour' | 'day' | 'week' | 'month';
  deposit: string;
  available: string;
  combo: Row[];
  attrs: Row[];
  /** Giá vốn bị ẩn theo quyền (`hidden_fields`) — ô không hiện, không gửi. */
  costHidden: boolean;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const num = (v: string) => (v ? Number(v) : undefined);

export function initialDraft(
  categories: string[],
  p?: Product,
  prefill?: Record<string, unknown> | null,
): ProductDraft {
  const pre = prefill ?? {};
  const str = (k: string, d = '') => (pre[k] == null ? d : String(pre[k]));
  return {
    name: str('name', p?.name),
    type: (str('type', p?.type ?? 'physical') as ProductType) || 'physical',
    category: str('category', p?.category ?? categories[0] ?? ''),
    price: digits(str('price', p?.price)),
    status: str('status', p?.status ?? 'active') === 'draft' ? 'draft' : 'active',
    channel: 'all',
    description: str('description', p?.description),
    sku: str('sku', p?.code),
    stock: p?.stock != null ? String(p.stock) : '',
    // Giá vốn bị ẩn (không có khoá) → để trống; gửi `undefined` = giữ nguyên giá trị đã lưu, không ghi đè bằng 0.
    cost: p?.cost ?? '',
    duration: p?.duration_min != null ? String(p.duration_min) : '',
    staff: '',
    sessions: p?.sessions != null ? String(p.sessions) : '',
    validMonths: p?.valid_days != null ? String(Math.round(p.valid_days / 30)) : '',
    perSession: '',
    grantOnDeposit: pre.grant_on_deposit != null ? !!pre.grant_on_deposit : !!p?.grant_on_deposit,
    rentUnit: (p?.rental_unit as ProductDraft['rentUnit']) || 'day',
    deposit: p?.deposit ?? '',
    available: '',
    combo: (p?.components ?? []).map((c) => ({ name: c.name, value: String(c.qty) })),
    attrs: (p?.attr_defs ?? []).map((a) => ({ name: a.name, value: a.values.join('/') })),
    costHidden: isFieldHidden(p, 'cost'),
  };
}

/** Tổ hợp biến thể từ thuộc tính (giá trị ngăn bởi "/"), tối đa 24 như prototype. */
export function variantsOf(attrs: Row[]): string[] {
  const lists = attrs
    .filter((a) => a.name.trim() && a.value.trim())
    .map((a) =>
      a.value
        .split('/')
        .map((v) => v.trim())
        .filter(Boolean),
    );
  if (!lists.length) return [];
  let combos: string[][] = [[]];
  for (const vals of lists) combos = combos.flatMap((c) => vals.map((v) => [...c, v]));
  return combos.slice(0, 24).map((c) => c.join(' · '));
}

/** Chuyển bản nháp sang input action product.create / product.update (tiền string VND, chỉ gửi ô có giá trị). Mô tả đi riêng qua trình soạn (TIP-027b). */
export function toInput(d: ProductDraft) {
  const attrs = d.attrs
    .filter((a) => a.name.trim() && a.value.trim())
    .map((a) => ({
      name: a.name.trim(),
      values: a.value
        .split('/')
        .map((v) => v.trim())
        .filter(Boolean),
    }));
  const combo = d.combo
    .filter((r) => r.name.trim())
    .map((r) => ({ name: r.name.trim(), qty: Math.max(1, Number(r.value) || 1) }));
  const sessions = num(d.sessions);
  const months = num(d.validMonths);
  const cost = d.costHidden ? undefined : d.cost || undefined;
  return {
    name: d.name.trim(),
    type: d.type,
    category: d.category || undefined,
    price: d.price,
    status: d.status,
    ...(d.type === 'physical'
      ? { sku: d.sku.trim() || undefined, stock: num(d.stock), cost }
      : {}),
    ...(d.type === 'service' ? { duration_min: num(d.duration), cost } : {}),
    ...(d.type === 'combo' && combo.length ? { components: combo } : {}),
    ...(d.type === 'package'
      ? {
          sessions: sessions && sessions > 0 ? sessions : undefined,
          valid_days: months && months > 0 ? months * 30 : undefined,
          grant_on_deposit: d.grantOnDeposit,
        }
      : {}),
    ...(d.type === 'rental' ? { rental_unit: d.rentUnit, deposit: d.deposit || undefined } : {}),
    ...(attrs.length ? { attrs } : {}),
  };
}

export function useProductForm(init: ProductDraft) {
  const [d, setD] = useState(init);
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const money = (k: 'price' | 'cost' | 'perSession' | 'deposit') => (v: string) => set(k, digits(v));
  const rows = (k: 'combo' | 'attrs') => ({
    add: () => setD((s) => ({ ...s, [k]: [...s[k], { name: '', value: '' }] })),
    del: (i: number) => setD((s) => ({ ...s, [k]: s[k].filter((_, j) => j !== i) })),
    edit: (i: number, p: Partial<Row>) =>
      setD((s) => ({ ...s, [k]: s[k].map((r, j) => (j === i ? { ...r, ...p } : r)) })),
  });
  const variants = useMemo(() => variantsOf(d.attrs), [d.attrs]);
  return {
    d,
    set,
    money,
    combo: rows('combo'),
    attrs: rows('attrs'),
    variants,
    valid: !!d.name.trim() && !!d.price,
  };
}

export type ProductFormApi = ReturnType<typeof useProductForm>;
