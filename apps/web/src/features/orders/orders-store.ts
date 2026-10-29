// UI state Đơn hàng: bộ lọc, chế độ xem, chọn nhiều, drawer, form tạo, huỷ đơn, AI panel, menu dòng.
import { create } from 'zustand';
import type { OrderFilter } from './types';

interface OrdersUi {
  filter: OrderFilter;
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
  set: (p: Partial<Omit<OrdersUi, 'set' | 'setFilter'>>) => void;
}

export const useOrdersUi = create<OrdersUi>((set) => ({
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
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, selected: [] })),
  set: (p) => set(p),
}));
