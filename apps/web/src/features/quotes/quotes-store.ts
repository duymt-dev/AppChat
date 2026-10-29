// UI state Báo giá: bộ lọc, chế độ xem, chọn nhiều, drawer chi tiết, form, AI panel, menu dòng.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { QuoteFilter } from './types';

interface QuotesUi {
  filter: QuoteFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  layout: 'list' | 'kanban';
  selected: string[];
  detail: string | null;
  tab: string;
  form: 'create' | null;
  draftOpen: boolean;
  aiOpen: boolean;
  menuFor: string | null;
  /** Giá trị Trợ lý điền sẵn cho form (UiCommand prefill `quote.form`). */
  prefill: Record<string, unknown> | null;
  setFilter: (p: Partial<QuoteFilter>) => void;
  set: (p: Partial<Omit<QuotesUi, 'set' | 'setFilter' | 'setPg'>>) => void;
}

export const useQuotesUi = create<QuotesUi>((set) => ({
  pg: FIRST_PAGE,
  filter: { status: 'all', owner_id: 'all', returning: 'all', q: '' },
  layout: 'list',
  selected: [],
  detail: null,
  tab: 'overview',
  form: null,
  draftOpen: false,
  aiOpen: false,
  menuFor: null,
  prefill: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 }, selected: [] })),
  set: (p) => set(p),
}));
