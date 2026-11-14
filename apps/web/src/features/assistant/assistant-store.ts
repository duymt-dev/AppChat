// UI state Trợ lý: chế độ, mức AI, agent Cowork, hội thoại hiện tại, popover / modal / drawer đang mở.
import { create } from 'zustand';
import type { UtilityActionId } from '@/shared/ai-utilities';
import type { ChatMessage, Mode, Tier } from './types';

export type AsstPop = 'plus' | 'tier' | 'agent' | 'utility' | null;

interface AssistantUi {
  mode: Mode;
  tier: Tier;
  /** Agent Cowork đã chọn — danh tính là `id` (UUID); `name` chỉ để hiển thị (TIP-023d §5.1, trùng tên vẫn phân biệt). */
  agent: { id: string; name: string } | null;
  /** Bản nháp kế hoạch tái dùng (plan_reuse) chờ gắn vào lượt Cowork kế tiếp — gửi một lần rồi bỏ (TIP-023d §4.3). */
  planDraft: { plan_id: string; revision: number } | null;
  draft: string;
  messages: ChatMessage[];
  typing: boolean;
  sessionId?: string;
  /** Run gốc của lượt Cowork cuối — khung điều phối đọc run con của nó (REQ-E14). */
  lastRunId: string | null;
  pop: AsstPop;
  popAnchor: { left: number; bottom: number; right: number };
  taskNew: boolean;
  /** Giá trị Trợ lý điền sẵn cho modal tạo tác vụ (UiCommand prefill `ai_task.form`). */
  taskPrefill: Record<string, unknown> | null;
  taskOpen: string | null;
  /** Modal chi tiết "Trợ lý AI đang điều phối" (REQ-E14). */
  runsOpen: boolean;
  /** Kỹ năng tiện ích AI đang mở trong host dưới ô soạn (TIP-019c §4.2) — độc lập với popover. */
  utility: UtilityActionId | null;
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
  planDraft: null,
  draft: '',
  messages: [],
  typing: false,
  lastRunId: null,
  pop: null,
  popAnchor: { left: 0, bottom: 0, right: 0 },
  taskNew: false,
  taskPrefill: null,
  taskOpen: null,
  runsOpen: false,
  utility: null,
  set: (p) => set(p),
  openPop: (pop, el) => {
    const r = el.getBoundingClientRect();
    set((s) => ({ pop: s.pop === pop ? null : pop, popAnchor: { left: r.left, right: r.right, bottom: window.innerHeight - r.top + 8 } }));
  },
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
  patchMsg: (id, p) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
  // Đổi phiên / workspace: bỏ chọn agent cũ (không mang lựa chọn sang phiên khác — §6.3).
  reset: () => set({ messages: [], draft: '', sessionId: undefined, typing: false, lastRunId: null, agent: null, planDraft: null }),
}));
