// State mở form / danh sách hoạt động CRM (TIP-026b §3.3) — mở từ Hồ sơ 360° (Hộp thư / Khách hàng) hoặc lệnh Trợ lý
// `prefill:contact_note|contact_task|contact_opportunity.form`. Form host mount MỘT lần ở CrmFormsHost (app/).
import { create } from 'zustand';
import type { ActivityKind } from '@appchat/shared';

export type ActivityFormKind = 'note' | 'comment' | 'task' | 'opportunity';

export interface ActivityFormTarget {
  kind: ActivityFormKind;
  contactId: string;
  /** Sửa bản ghi có sẵn (id + version từ reader) — trống = tạo mới. */
  editId?: string;
  /** Giá trị điền sẵn (Trợ lý / nguồn hội thoại) — chỉ điền, người dùng vẫn bấm Lưu. */
  values?: Record<string, unknown>;
}

interface ActivityUi {
  form: ActivityFormTarget | null;
  list: { contactId: string; kind: ActivityKind } | null;
  openForm: (t: ActivityFormTarget) => void;
  closeForm: () => void;
  openList: (contactId: string, kind: ActivityKind) => void;
  closeList: () => void;
}

export const useActivityUi = create<ActivityUi>((set) => ({
  form: null,
  list: null,
  openForm: (form) => set({ form }),
  closeForm: () => set({ form: null }),
  openList: (contactId, kind) => set({ list: { contactId, kind } }),
  closeList: () => set({ list: null }),
}));
