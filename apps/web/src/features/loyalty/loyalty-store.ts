// UI state Khách thân thiết: bộ lọc thành viên, drawer thành viên + tab, hộp điều chỉnh điểm (3 bước), cấu hình, thử nghiệm tính điểm, menu dòng.
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';
import type { MemberFilter } from './types';

export type MemberTab = 'overview' | 'crm' | 'ai' | 'files' | 'history';

interface LoyaltyUi {
  filter: MemberFilter;
  /** Trang bảng (D42) — đổi bộ lọc thì về trang 1. */
  pg: PageState;
  setPg: (p: PageState) => void;
  detail: string | null;
  tab: MemberTab;
  /** Hộp "Thêm thành viên & ghi nhận điểm"; `adjustFor` = SĐT điền sẵn khi mở từ một thành viên. */
  adjust: boolean;
  adjustFor: string | null;
  config: boolean;
  sim: boolean;
  menuFor: string | null;
  setFilter: (p: Partial<MemberFilter>) => void;
  set: (p: Partial<Omit<LoyaltyUi, 'set' | 'setFilter' | 'setPg'>>) => void;
}

export const useLoyaltyUi = create<LoyaltyUi>((set) => ({
  pg: FIRST_PAGE,
  filter: { tier: 'all', q: '' },
  detail: null,
  tab: 'overview',
  adjust: false,
  adjustFor: null,
  config: false,
  sim: false,
  menuFor: null,
  setPg: (pg) => set({ pg }),
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p }, pg: { ...s.pg, page: 1 } })),
  set: (p) => set(p),
}));
