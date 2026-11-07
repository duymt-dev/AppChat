// UI state màn Khách hàng: bộ lọc, chế độ xem, modal / drawer / menu đang mở.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { ContactFilter } from './api';

export type CrmModal = 'create' | 'edit' | 'dedupe' | 'fields' | 'ai' | 'peek' | 'collab' | 'transfer' | 'import' | 'bulkTransfer' | null;

interface CrmUiState {
  filter: ContactFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  layout: 'list' | 'kanban';
  modal: CrmModal;
  /** Khách đang mở (drawer 360° / modal sửa / collaborators / chuyển phụ trách). */
  target: string | null;
  detail: string | null;
  menuFor: string | null;
  tagFor: string | null;
  filterOpen: boolean;
  /** Giá trị Trợ lý điền sẵn cho form tạo / sửa (UiCommand prefill `contact.form`). */
  prefill: Record<string, string> | null;
  /** Khách Trợ lý tô sáng (UiCommand highlight) — đổi bộ lọc / đóng drawer thì bỏ. */
  highlight: string | null;
  /** Câu đề xuất của "Giao AI" (TIP-015b) — điền sẵn ô hỏi của drawer Trợ lý, người dùng xem rồi mới gửi (không tự gửi). */
  aiDraft: string | null;
  setFilter: (p: Partial<ContactFilter>) => void;
  set: (p: Partial<Pick<CrmUiState, 'layout' | 'modal' | 'target' | 'detail' | 'menuFor' | 'tagFor' | 'filterOpen' | 'prefill' | 'highlight' | 'aiDraft'>>) => void;
  open: (modal: Exclude<CrmModal, null>, target?: string) => void;
}

export const EMPTY_FILTER: ContactFilter = { stage: 'all', q: '', mine: false, status: '', owner_id: '', group: '', source: '', tag_id: '', sort: 'recent' };

export const useCrmUi = create<CrmUiState>((set) => ({
  pg: FIRST_PAGE,
  filter: EMPTY_FILTER,
  layout: 'list',
  modal: null,
  target: null,
  detail: null,
  menuFor: null,
  tagFor: null,
  filterOpen: false,
  prefill: null,
  highlight: null,
  aiDraft: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 }, highlight: null })),
  set: (p) => set(p),
  open: (modal, target) => set({ modal, target: target ?? null, menuFor: null, tagFor: null, prefill: null }),
}));
