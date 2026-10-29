// UI state Sản phẩm: bộ lọc, chế độ xem, drawer chi tiết, modal thêm / sửa, menu dòng.
import { create } from 'zustand';
import type { ProductFilter } from './types';

interface ProductsUi {
  filter: ProductFilter;
  layout: 'list' | 'kanban';
  detail: string | null;
  tab: string;
  form: 'create' | 'edit' | null;
  target: string | null;
  menuFor: string | null;
  /** Giá trị Trợ lý điền sẵn cho form (UiCommand prefill `product.form`). */
  prefill: Record<string, unknown> | null;
  setFilter: (p: Partial<ProductFilter>) => void;
  set: (p: Partial<Omit<ProductsUi, 'set' | 'setFilter'>>) => void;
}

export const useProductsUi = create<ProductsUi>((set) => ({
  filter: { category: 'all', q: '' },
  layout: 'list',
  detail: null,
  tab: 'overview',
  form: null,
  target: null,
  menuFor: null,
  prefill: null,
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p } })),
  set: (p) => set(p),
}));
