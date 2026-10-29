// UI state Sản phẩm: bộ lọc, chế độ xem, drawer chi tiết, modal thêm / sửa, menu dòng.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { ProductFilter } from './types';

interface ProductsUi {
  filter: ProductFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  layout: 'list' | 'kanban';
  detail: string | null;
  tab: string;
  form: 'create' | 'edit' | null;
  target: string | null;
  menuFor: string | null;
  /** Giá trị Trợ lý điền sẵn cho form (UiCommand prefill `product.form`). */
  prefill: Record<string, unknown> | null;
  setFilter: (p: Partial<ProductFilter>) => void;
  set: (p: Partial<Omit<ProductsUi, 'set' | 'setFilter' | 'setPg'>>) => void;
}

export const useProductsUi = create<ProductsUi>((set) => ({
  pg: FIRST_PAGE,
  filter: { category: 'all', q: '' },
  layout: 'list',
  detail: null,
  tab: 'overview',
  form: null,
  target: null,
  menuFor: null,
  prefill: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 } })),
  set: (p) => set(p),
}));
