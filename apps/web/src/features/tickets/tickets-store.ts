// UI state Ticket: bộ lọc, chế độ xem, chọn nhiều, drawer + tab, form tạo, hộp đóng ticket, AI panel, menu dòng.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { TicketFilter } from './types';

export type DetailTab = 'detail' | 'thread' | 'history' | 'sla';

interface TicketsUi {
  filter: TicketFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  layout: 'list' | 'kanban';
  selected: string[];
  detail: string | null;
  tab: DetailTab;
  form: boolean;
  closeFor: string | null;
  aiOpen: boolean;
  menuFor: string | null;
  /** Giá trị Trợ lý điền sẵn cho form (UiCommand prefill `ticket.form`). */
  prefill: Record<string, unknown> | null;
  setFilter: (p: Partial<TicketFilter>) => void;
  set: (p: Partial<Omit<TicketsUi, 'set' | 'setFilter' | 'setPg'>>) => void;
}

export const EMPTY_FILTER: TicketFilter = {
  priority: 'all',
  status: 'all',
  team: 'all',
  category: 'all',
  assignee: 'all',
  sla: 'all',
  q: '',
  sort: 'recent',
};

export const useTicketsUi = create<TicketsUi>((set) => ({
  pg: FIRST_PAGE,
  filter: EMPTY_FILTER,
  layout: 'list',
  selected: [],
  detail: null,
  tab: 'detail',
  form: false,
  closeFor: null,
  aiOpen: false,
  menuFor: null,
  prefill: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 }, selected: [] })),
  set: (p) => set(p),
}));
