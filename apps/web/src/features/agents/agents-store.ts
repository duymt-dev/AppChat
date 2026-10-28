// UI state AI Agents: drawer Trợ lý thu nhỏ, drawer lịch sử phiên bản, bản nháp Trợ lý chuyển sang builder.
import { create } from 'zustand';
import type { AgentConfig } from './types';

interface AgentsUi {
  aiOpen: boolean;
  versionsFor: string | null;
  /** Bản nháp từ agent.draft_from_description khi người dùng chọn "Mở trong builder". */
  handoff: Partial<AgentConfig> | null;
  set: (p: Partial<Omit<AgentsUi, 'set'>>) => void;
}

export const useAgentsUi = create<AgentsUi>((set) => ({
  aiOpen: false,
  versionsFor: null,
  handoff: null,
  set: (p) => set(p),
}));
