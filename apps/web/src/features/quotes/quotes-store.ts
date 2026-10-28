// UI state Báo giá: bộ lọc, chế độ xem, chọn nhiều, drawer chi tiết, form, AI panel, menu dòng.
import { create } from 'zustand';
import type { QuoteFilter } from './types';

interface QuotesUi {
  filter: QuoteFilter;
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
  set: (p: Partial<Omit<QuotesUi, 'set' | 'setFilter'>>) => void;
}

export const useQuotesUi = create<QuotesUi>((set) => ({
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
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, selected: [] })),
  set: (p) => set(p),
}));
