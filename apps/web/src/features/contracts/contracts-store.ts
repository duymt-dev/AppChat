// UI state Hợp đồng: bộ lọc, chế độ xem, chọn nhiều, drawer, form tạo, duyệt & ký, gửi ký, AI panel, menu dòng.
import { create } from 'zustand';
import type { ContractFilter } from './types';

interface ContractsUi {
  filter: ContractFilter;
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
  set: (p: Partial<Omit<ContractsUi, 'set' | 'setFilter'>>) => void;
}

export const useContractsUi = create<ContractsUi>((set) => ({
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
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, selected: [] })),
  set: (p) => set(p),
}));
