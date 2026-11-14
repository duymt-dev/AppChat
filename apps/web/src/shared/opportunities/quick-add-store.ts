// Thêm nhanh cơ hội đang mở cho khách nào (TIP-026c §5.1) — thẻ 360° của đúng khách hiện ô; lệnh Trợ lý `prefill:opportunity.form` điền
// sẵn tên / giá trị (VND) — người dùng vẫn bấm Lưu.
import { create } from 'zustand';

interface QuickAddUi {
  contactId: string | null;
  values: Record<string, unknown>;
  start: (contactId: string, values?: Record<string, unknown>) => void;
  stop: () => void;
}

export const useQuickAddUi = create<QuickAddUi>((set) => ({
  contactId: null,
  values: {},
  start: (contactId, values = {}) => set({ contactId, values }),
  stop: () => set({ contactId: null, values: {} }),
}));
