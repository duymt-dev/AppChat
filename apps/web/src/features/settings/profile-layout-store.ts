// UI state hộp Tuỳ chỉnh Hồ sơ 360° (REQ-F12) — mở từ Cài đặt lẫn từ Panel360 (Hộp thư), nên tách khỏi settings-store
// để Panel360 (feature khác) chỉ cần import đúng phần cần, không kéo theo toàn bộ state Cài đặt.
import { create } from 'zustand';

interface ProfileLayoutUi {
  /** id mẫu đang mở hộp Tuỳ chỉnh; null = đóng. */
  editId: string | null;
  /** Form "+ Thêm tab mới" đang mở trong hộp Tuỳ chỉnh. */
  adding: { name: string; blocks: string[] } | null;
  open: (id: string) => void;
  close: () => void;
  setAdding: (p: { name: string; blocks: string[] } | null) => void;
}

export const useProfileLayoutUi = create<ProfileLayoutUi>((set) => ({
  editId: null,
  adding: null,
  open: (id) => set({ editId: id, adding: null }),
  close: () => set({ editId: null, adding: null }),
  setAdding: (adding) => set({ adding }),
}));
