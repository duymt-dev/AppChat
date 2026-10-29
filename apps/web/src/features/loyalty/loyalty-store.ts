// UI state Khách thân thiết: bộ lọc thành viên, drawer thành viên + tab, hộp điều chỉnh điểm (3 bước), cấu hình, thử nghiệm tính điểm, menu dòng.
import { create } from 'zustand';
import type { MemberFilter } from './types';

export type MemberTab = 'overview' | 'crm' | 'ai' | 'files' | 'history';

interface LoyaltyUi {
  filter: MemberFilter;
  detail: string | null;
  tab: MemberTab;
  /** Hộp "Thêm thành viên & ghi nhận điểm"; `adjustFor` = SĐT điền sẵn khi mở từ một thành viên. */
  adjust: boolean;
  adjustFor: string | null;
  config: boolean;
  sim: boolean;
  menuFor: string | null;
  setFilter: (p: Partial<MemberFilter>) => void;
  set: (p: Partial<Omit<LoyaltyUi, 'set' | 'setFilter'>>) => void;
}

export const useLoyaltyUi = create<LoyaltyUi>((set) => ({
  filter: { tier: 'all', q: '' },
  detail: null,
  tab: 'overview',
  adjust: false,
  adjustFor: null,
  config: false,
  sim: false,
  menuFor: null,
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p } })),
  set: (p) => set(p),
}));
