// UI state hộp thư (Blueprint §7.3 `inboxUi`): hội thoại đang mở, rail thư mục, hồ sơ 360°, menu / popover đang mở.
import { create } from 'zustand';
import type { ChannelType } from './types';

export type InboxPop = 'convMenu' | 'chatMenu' | 'account' | 'qr' | 'sched' | 'xl' | 'attach' | null;
export type InboxModal = 'connect' | 'ai' | null;
export type Tab360 = 'overview' | 'crm' | 'ai' | 'files' | 'history';

interface InboxUiState {
  selectedId: string;
  /** < md: đang xem danh sách hay khung chat. */
  mobileChat: boolean;
  folderRail: boolean;
  show360: boolean;
  tab: string;
  tab360: Tab360;
  channel: ChannelType | null;
  account: string | null;
  sort: string;
  pop: InboxPop;
  menuFor: string | null;
  modal: InboxModal;
  composerMode: 'reply' | 'note';
  autoXl: boolean;
  /** Bản nháp composer (Trợ lý điền qua UiCommand prefill `inbox.composer`). */
  draft: string;
  select: (id: string) => void;
  backToList: () => void;
  toggleRail: () => void;
  toggle360: () => void;
  set: (p: Partial<Pick<InboxUiState, 'tab' | 'tab360' | 'channel' | 'account' | 'sort' | 'modal' | 'composerMode' | 'autoXl' | 'draft'>>) => void;
  togglePop: (p: Exclude<InboxPop, null>, menuFor?: string) => void;
  closePop: () => void;
}

/** ≤ 1180px hồ sơ 360° là lớp trượt phủ (prototype CSS L84) — mặc định đóng, mở bằng nút hồ sơ. */
const wide = () => typeof window === 'undefined' || window.innerWidth > 1180;

export const useInboxUi = create<InboxUiState>((set) => ({
  selectedId: 'c_lan',
  mobileChat: false,
  folderRail: false,
  show360: wide(),
  tab: 'all',
  tab360: 'overview',
  channel: null,
  account: null,
  sort: 'latest',
  pop: null,
  menuFor: null,
  modal: null,
  composerMode: 'reply',
  autoXl: false,
  draft: '',
  select: (selectedId) => set({ selectedId, mobileChat: true, pop: null, tab360: 'overview', draft: '' }),
  backToList: () => set({ mobileChat: false }),
  toggleRail: () => set((s) => ({ folderRail: !s.folderRail })),
  toggle360: () => set((s) => ({ show360: !s.show360 })),
  set: (p) => set(p),
  togglePop: (p, menuFor) => set((s) => (s.pop === p && s.menuFor === (menuFor ?? null) ? { pop: null, menuFor: null } : { pop: p, menuFor: menuFor ?? null })),
  closePop: () => set({ pop: null, menuFor: null }),
}));
