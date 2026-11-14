// State drawer Cơ hội 360° (TIP-026c §5.1) — mở từ thẻ 360°, cột Khách hàng, chip Hộp thư, lệnh Trợ lý `open:opportunity`. Drawer mount
// MỘT lần ở CrmFormsHost (qua ActivityFormHost); id cơ hội đủ — khách đọc từ chi tiết (`contact_id`). Thêm nhanh là state cục bộ của thẻ.
import { create } from 'zustand';

interface OpportunityUi {
  drawer: string | null;
  /** Ô chọn lý do Thua đang mở trong drawer (bắt buộc chọn 1 trong 4 mã trước khi gửi). */
  askLost: boolean;
  open: (id: string) => void;
  close: () => void;
  setAskLost: (v: boolean) => void;
}

export const useOpportunityUi = create<OpportunityUi>((set) => ({
  drawer: null,
  askLost: false,
  open: (drawer) => set({ drawer, askLost: false }),
  close: () => set({ drawer: null, askLost: false }),
  setAskLost: (askLost) => set({ askLost }),
}));
