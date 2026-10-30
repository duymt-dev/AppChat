// State mở modal "Gửi email" dùng chung (REQ-F11 Hồ sơ 360°, prototype L760–776) — mở từ bất kỳ feature nào.
import { create } from 'zustand';

interface EmailComposeTarget {
  contactId: string;
  to: string;
}

interface EmailComposeUi {
  target: EmailComposeTarget | null;
  open: (t: EmailComposeTarget) => void;
  close: () => void;
}

export const useEmailComposeUi = create<EmailComposeUi>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));
