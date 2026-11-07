// UI state Đơn hàng: bộ lọc, chế độ xem, chọn nhiều, drawer, form tạo, huỷ đơn, AI panel, menu dòng.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { OrderFilter } from './types';

interface OrdersUi {
  filter: OrderFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  layout: 'list' | 'kanban';
  selected: string[];
  detail: string | null;
  tab: string;
  form: 'create' | null;
  /** Đơn đang mở hộp "Huỷ đơn" (lý do bắt buộc). */
  cancelFor: string | null;
  aiOpen: boolean;
  menuFor: string | null;
  /** Giá trị Trợ lý điền sẵn cho form (UiCommand prefill `order.form`). */
  prefill: Record<string, unknown> | null;
  setFilter: (p: Partial<OrderFilter>) => void;
  set: (p: Partial<Omit<OrdersUi, 'set' | 'setFilter' | 'setPg'>>) => void;
}

export const useOrdersUi = create<OrdersUi>((set) => ({
  pg: FIRST_PAGE,
  filter: { chip: 'all', owner_id: 'all', value: 'all', source: 'all', q: '' },
  layout: 'list',
  selected: [],
  detail: null,
  tab: 'overview',
  form: null,
  cancelFor: null,
  aiOpen: false,
  menuFor: null,
  prefill: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 }, selected: [] })),
  set: (p) => set(p),
}));
