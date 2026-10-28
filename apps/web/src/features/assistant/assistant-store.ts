// UI state Trợ lý: chế độ, mức AI, agent Cowork, hội thoại hiện tại, popover / modal / drawer đang mở.
import { create } from 'zustand';
import type { ChatMessage, Mode, Tier } from './types';

export type AsstPop = 'plus' | 'tier' | 'agent' | null;

interface AssistantUi {
  mode: Mode;
  tier: Tier;
  agent: string | null;
  draft: string;
  messages: ChatMessage[];
  typing: boolean;
  sessionId?: string;
  pop: AsstPop;
  popAnchor: { left: number; bottom: number; right: number };
  taskNew: boolean;
  /** Giá trị Trợ lý điền sẵn cho modal tạo tác vụ (UiCommand prefill `ai_task.form`). */
  taskPrefill: Record<string, unknown> | null;
  taskOpen: string | null;
  set: (p: Partial<Omit<AssistantUi, 'set' | 'openPop' | 'push' | 'patchMsg' | 'reset'>>) => void;
  openPop: (pop: Exclude<AsstPop, null>, el: HTMLElement) => void;
  push: (m: ChatMessage) => void;
  patchMsg: (id: string, p: Partial<ChatMessage>) => void;
  reset: () => void;
}

export const useAssistantUi = create<AssistantUi>((set) => ({
  mode: 'chat',
  tier: 'advanced',
  agent: null,
  draft: '',
  messages: [],
  typing: false,
  pop: null,
  popAnchor: { left: 0, bottom: 0, right: 0 },
  taskNew: false,
  taskPrefill: null,
  taskOpen: null,
  set: (p) => set(p),
  openPop: (pop, el) => {
    const r = el.getBoundingClientRect();
    set((s) => ({ pop: s.pop === pop ? null : pop, popAnchor: { left: r.left, right: r.right, bottom: window.innerHeight - r.top + 8 } }));
  },
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
  patchMsg: (id, p) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
  reset: () => set({ messages: [], draft: '', sessionId: undefined, typing: false }),
}));
