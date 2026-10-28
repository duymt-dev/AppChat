// UI state Ticket: bộ lọc, chế độ xem, chọn nhiều, drawer + tab, form tạo, hộp đóng ticket, AI panel, menu dòng.
import { create } from 'zustand';
import type { TicketFilter } from './types';

export type DetailTab = 'detail' | 'thread' | 'history' | 'sla';

interface TicketsUi {
  filter: TicketFilter;
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
  set: (p: Partial<Omit<TicketsUi, 'set' | 'setFilter'>>) => void;
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
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, selected: [] })),
  set: (p) => set(p),
}));
