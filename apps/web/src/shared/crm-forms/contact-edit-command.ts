// Lệnh mở form sửa khách toàn cục (TIP-025b §D.3) — bất kỳ feature nào (Hồ sơ 360° ở Hộp thư, Trợ lý) mở được mà không import
// components của customers: đặt `contactId` ở đây, ContactFormHost (app/(app)/_crm-forms) đọc ngữ cảnh sửa từ server rồi mở form.
import { create } from 'zustand';

type Mode = 'edit' | 'transfer';

interface ContactEditUi {
  target: { contactId: string; mode: Mode; toUserId?: string } | null;
  open: (contactId: string, mode?: Mode, toUserId?: string) => void;
  close: () => void;
}

export const useContactEditUi = create<ContactEditUi>((set) => ({
  target: null,
  open: (contactId, mode = 'edit', toUserId) => set({ target: { contactId, mode, ...(toUserId ? { toUserId } : {}) } }),
  close: () => set({ target: null }),
}));
