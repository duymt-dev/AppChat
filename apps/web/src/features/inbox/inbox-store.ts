// UI state hộp thư (Blueprint §7.3 `inboxUi`): hội thoại đang mở, rail thư mục, hồ sơ 360°, menu / popover đang mở.
import { create } from 'zustand';
import type { ChannelType } from './types';

export type InboxPop = 'convMenu' | 'chatMenu' | 'account' | 'qr' | 'sched' | 'xl' | 'attach' | null;
export type InboxModal = 'connect' | 'ai' | 'forward' | null;
export type Tab360 = 'overview' | 'crm' | 'ai' | 'files' | 'history';
/** Submenu đang mở trong menu ⋯ hội thoại (REQ-C10): null = danh sách chính. */
export type ConvSub = 'hide' | 'shortcut' | 'assign' | 'stage' | 'tags' | null;

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
  convSub: ConvSub;
  modal: InboxModal;
  /** Tin đang được chuyển tiếp — nguồn cho modal "Chuyển tiếp" (REQ-C09). */
  forwardFrom: { convId: string; messageId: string } | null;
  composerMode: 'reply' | 'note';
  autoXl: boolean;
  /** Bản nháp composer (Trợ lý điền qua UiCommand prefill `inbox.composer`). */
  draft: string;
  /** Tin đang được trích để trả lời (REQ-C09 "Trả lời"). */
  replyTo: { id: string; preview: string } | null;
  /** Tìm trong hội thoại (REQ-C12). */
  searchOpen: boolean;
  searchQuery: string;
  searchSender: 'all' | 'contact' | 'user' | 'agent';
  select: (id: string) => void;
  backToList: () => void;
  toggleRail: () => void;
  toggle360: () => void;
  set: (
    p: Partial<
      Pick<
        InboxUiState,
        | 'tab'
        | 'tab360'
        | 'channel'
        | 'account'
        | 'sort'
        | 'modal'
        | 'composerMode'
        | 'autoXl'
        | 'draft'
        | 'replyTo'
        | 'searchOpen'
        | 'searchQuery'
        | 'searchSender'
        | 'forwardFrom'
      >
    >,
  ) => void;
  togglePop: (p: Exclude<InboxPop, null>, menuFor?: string) => void;
  closePop: () => void;
  openConvSub: (s: Exclude<ConvSub, null>) => void;
  closeConvMenu: () => void;
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
  convSub: null,
  modal: null,
  forwardFrom: null,
  composerMode: 'reply',
  autoXl: false,
  draft: '',
  replyTo: null,
  searchOpen: false,
  searchQuery: '',
  searchSender: 'all',
  select: (selectedId) => set({ selectedId, mobileChat: true, pop: null, tab360: 'overview', draft: '', replyTo: null, searchOpen: false, searchQuery: '' }),
  backToList: () => set({ mobileChat: false }),
  toggleRail: () => set((s) => ({ folderRail: !s.folderRail })),
  toggle360: () => set((s) => ({ show360: !s.show360 })),
  set: (p) => set(p),
  togglePop: (p, menuFor) =>
    set((s) => (s.pop === p && s.menuFor === (menuFor ?? null) ? { pop: null, menuFor: null, convSub: null } : { pop: p, menuFor: menuFor ?? null, convSub: null })),
  closePop: () => set({ pop: null, menuFor: null, convSub: null }),
  openConvSub: (convSub) => set({ convSub }),
  closeConvMenu: () => set({ pop: null, menuFor: null, convSub: null }),
}));
