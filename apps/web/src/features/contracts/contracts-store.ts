// UI state Hợp đồng: bộ lọc, chế độ xem, chọn nhiều, drawer, form tạo, duyệt & ký, gửi ký, AI panel, menu dòng.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { ContractFilter } from './types';

interface ContractsUi {
  filter: ContractFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  layout: 'list' | 'kanban';
  selected: string[];
  detail: string | null;
  tab: string;
  form: 'create' | null;
  /** Hợp đồng đang mở hộp "Duyệt & ký" / "Gửi ký". */
  signFor: string | null;
  sendFor: string | null;
  aiOpen: boolean;
  menuFor: string | null;
  /** Giá trị Trợ lý điền sẵn cho form (UiCommand prefill `contract.form`). */
  prefill: Record<string, unknown> | null;
  setFilter: (p: Partial<ContractFilter>) => void;
  set: (p: Partial<Omit<ContractsUi, 'set' | 'setFilter' | 'setPg'>>) => void;
}

export const useContractsUi = create<ContractsUi>((set) => ({
  pg: FIRST_PAGE,
  filter: { status: 'all', owner_id: 'all', value: 'all', q: '' },
  layout: 'list',
  selected: [],
  detail: null,
  tab: 'overview',
  form: null,
  signFor: null,
  sendFor: null,
  aiOpen: false,
  menuFor: null,
  prefill: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 }, selected: [] })),
  set: (p) => set(p),
}));
