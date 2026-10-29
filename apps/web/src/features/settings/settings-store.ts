// UI state Cài đặt (frontend-structure §5: zustand chỉ giữ trạng thái giao diện; dữ liệu ở TanStack Query).
import { create } from 'zustand';
import type { SystemRole } from '@appchat/shared';

export interface MemberDraft {
  /** Có id → sửa vai trò; không → mời mới. */
  id?: string;
  name: string;
  email: string;
  role: Exclude<SystemRole, 'owner'>;
}

interface SettingsUi {
  memberQ: string;
  memberModal: MemberDraft | null;
  menuFor: string | null;
  set: (p: Partial<Omit<SettingsUi, 'set'>>) => void;
}

export const useSettingsUi = create<SettingsUi>((setState) => ({
  memberQ: '',
  memberModal: null,
  menuFor: null,
  set: (p) => setState(p),
}));
