// UI state AI Agents: drawer Trợ lý thu nhỏ, drawer lịch sử phiên bản, bản nháp Trợ lý chuyển sang builder.
import { create } from 'zustand';
import type { AgentConfig, TemplateFilter } from './types';

export const ALL_TEMPLATES: TemplateFilter = { q: '', group: 'all', industry: 'all', name: 'all' };

interface AgentsUi {
  aiOpen: boolean;
  versionsFor: string | null;
  /** Bản nháp từ agent.draft_from_description khi người dùng chọn "Mở trong builder". */
  handoff: Partial<AgentConfig> | null;
  /** Bộ lọc thư viện mẫu (UiCommand filter `agent_templates` ghi vào đây). */
  tplFilter: TemplateFilter;
  tplPage: number;
  setTplFilter: (p: Partial<TemplateFilter>) => void;
  set: (p: Partial<Omit<AgentsUi, 'set' | 'setTplFilter'>>) => void;
}

export const useAgentsUi = create<AgentsUi>((set) => ({
  aiOpen: false,
  versionsFor: null,
  handoff: null,
  tplFilter: ALL_TEMPLATES,
  tplPage: 1,
  setTplFilter: (p) => set((s) => ({ tplFilter: { ...s.tplFilter, ...p }, tplPage: 1 })),
  set: (p) => set(p),
}));
