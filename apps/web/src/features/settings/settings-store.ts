// UI state Cài đặt (frontend-structure §5: zustand chỉ giữ trạng thái giao diện; dữ liệu ở TanStack Query).
import { create } from 'zustand';
import type { FieldEntity } from './types';
import type { RoleDraft, TeamDraft } from './roles.types';
import type { RoutingDraft } from './routing.types';

export interface MemberDraft {
  /** Có id → sửa vai trò; không → mời mới. */
  id?: string;
  name: string;
  email: string;
  /** Vai trò gán được: hệ thống (trừ Chủ sở hữu) hoặc `custom:<uuid>` (TIP-042). */
  role: string;
}

interface SettingsUi {
  memberQ: string;
  memberModal: MemberDraft | null;
  /** Trình sửa vai trò tuỳ biến (TIP-042) — null = đóng. */
  roleEditor: RoleDraft | null;
  /** Trình sửa nhóm (TIP-042) — null = đóng. */
  teamEditor: TeamDraft | null;
  /** Trình sửa rule chia lead (TIP-042b) — null = đóng. */
  routingEditor: RoutingDraft | null;
  /** Hộp chuyển quyền Chủ sở hữu (TIP-045b A3). */
  transferOpen: boolean;
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
  /** Drawer sửa thư mục KB (TIP-020b) — id thư mục đang sửa. */
  kbFolderEdit: string | null;
  docKind: string;
  /** Hộp mẫu: `{ source }` = tạo mới; có id = sửa. */
  docModal: { id?: string; source: 'rich' | 'docx' } | null;
  set: (p: Partial<Omit<SettingsUi, 'set'>>) => void;
}

export const useSettingsUi = create<SettingsUi>((setState) => ({
  memberQ: '',
  memberModal: null,
  roleEditor: null,
  teamEditor: null,
  routingEditor: null,
  transferOpen: false,
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
  kbFolderEdit: null,
  docKind: 'all',
  docModal: null,
  set: (p) => setState(p),
}));
