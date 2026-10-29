// UI state màn Khách hàng: bộ lọc, chế độ xem, modal / drawer / menu đang mở.
import { create } from 'zustand';
import type { ContactFilter } from './api';

export type CrmModal = 'create' | 'edit' | 'dedupe' | 'fields' | 'ai' | 'peek' | 'collab' | 'transfer' | null;

interface CrmUiState {
  filter: ContactFilter;
  layout: 'list' | 'kanban';
  modal: CrmModal;
  /** Khách đang mở (drawer 360° / modal sửa / collaborators / chuyển phụ trách). */
  target: string | null;
  detail: string | null;
  menuFor: string | null;
  tagFor: string | null;
  filterOpen: boolean;
  setFilter: (p: Partial<ContactFilter>) => void;
  set: (p: Partial<Pick<CrmUiState, 'layout' | 'modal' | 'target' | 'detail' | 'menuFor' | 'tagFor' | 'filterOpen'>>) => void;
  open: (modal: Exclude<CrmModal, null>, target?: string) => void;
}

export const EMPTY_FILTER: ContactFilter = { stage: 'all', q: '', mine: false, status: '', owner_id: '', group: '', source: '' };

export const useCrmUi = create<CrmUiState>((set) => ({
  filter: EMPTY_FILTER,
  layout: 'list',
  modal: null,
  target: null,
  detail: null,
  menuFor: null,
  tagFor: null,
  filterOpen: false,
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p } })),
  set: (p) => set(p),
  open: (modal, target) => set({ modal, target: target ?? null, menuFor: null, tagFor: null }),
}));
