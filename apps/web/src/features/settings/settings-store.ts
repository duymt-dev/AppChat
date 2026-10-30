// UI state Cài đặt (frontend-structure §5: zustand chỉ giữ trạng thái giao diện; dữ liệu ở TanStack Query).
import { create } from 'zustand';
import type { SystemRole } from '@appchat/shared';
import type { FieldEntity } from './types';

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
  chanFilter: 'all' | 'on' | 'off';
  chanView: 'cards' | 'list';
  /** Wizard kết nối kênh 3 bước (B10): null = đóng; type null = đang ở bước chọn kênh; `accountId` = quét lại tài khoản đó (Kết nối lại). */
  channelWizard: { type: string | null; step: 1 | 2 | 3; accountId?: string } | null;
  /** Drawer Quản lý kênh 2 cấp (B11): accountId null = cấp 1 danh sách, có id = cấp 2 chi tiết. */
  channelDrawer: { type: string; accountId: string | null } | null;
  integCat: string;
  /** key connector đang mở hộp kết nối. */
  integModal: string | null;
  tagQ: string;
  /** null = đóng; `{}` = tạo; có id = sửa. */
  tagModal: { id?: string } | null;
  replyQ: string;
  replyModal: { id?: string } | null;
  fieldEntity: FieldEntity;
  fieldQ: string;
  fieldModal: { key?: string } | null;
  kbNav: string;
  kbFolder: string | null;
  kbQ: string;
  kbUpload: boolean;
  docKind: string;
  /** Hộp mẫu: `{ source }` = tạo mới; có id = sửa. */
  docModal: { id?: string; source: 'rich' | 'docx' } | null;
  set: (p: Partial<Omit<SettingsUi, 'set'>>) => void;
}

export const useSettingsUi = create<SettingsUi>((setState) => ({
  memberQ: '',
  memberModal: null,
  menuFor: null,
  chanFilter: 'all',
  chanView: 'cards',
  channelWizard: null,
  channelDrawer: null,
  integCat: 'all',
  integModal: null,
  tagQ: '',
  tagModal: null,
  replyQ: '',
  replyModal: null,
  fieldEntity: 'contact',
  fieldQ: '',
  fieldModal: null,
  kbNav: 'all',
  kbFolder: null,
  kbQ: '',
  kbUpload: false,
  docKind: 'all',
  docModal: null,
  set: (p) => setState(p),
}));
