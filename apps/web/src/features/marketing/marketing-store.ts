// UI state Marketing: bộ lọc (kênh + trạng thái + tìm), menu dòng, wizard (bước + nguồn AI), phân tích AI, trang chi tiết, AI panel.
import { create } from 'zustand';
import type { CampaignFilter } from './types';

export type DetailTab = 'recipients' | 'content' | 'history';
export type AnalyzeStage = 'loading' | 'list' | 'detail';

interface MarketingUi {
  filter: CampaignFilter;
  menuFor: string | null;
  wizard: boolean;
  /** Đề xuất AI đang dùng làm nguồn cho wizard. */
  fromSuggestion: string | null;
  /** Giá trị Trợ lý điền sẵn (UiCommand prefill `campaign.form`). */
  prefill: Record<string, unknown> | null;
  analyze: AnalyzeStage | null;
  pick: string | null;
  detail: string | null;
  tab: DetailTab;
  aiOpen: boolean;
  setFilter: (p: Partial<CampaignFilter>) => void;
  set: (p: Partial<Omit<MarketingUi, 'set' | 'setFilter'>>) => void;
}

export const EMPTY_FILTER: CampaignFilter = { status: 'all', channel: 'all', q: '' };

export const useMarketingUi = create<MarketingUi>((set) => ({
  filter: EMPTY_FILTER,
  menuFor: null,
  wizard: false,
  fromSuggestion: null,
  prefill: null,
  analyze: null,
  pick: null,
  detail: null,
  tab: 'recipients',
  aiOpen: false,
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p } })),
  set: (p) => set(p),
}));
