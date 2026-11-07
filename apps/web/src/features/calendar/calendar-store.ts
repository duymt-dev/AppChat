// UI state Lịch hẹn: chế độ xem + ngày neo, bộ lọc, drawer, form tạo / đổi giờ, huỷ, AI panel, gợi ý tạo đơn.
import { create } from 'zustand';
import type { CalFilter, CalView } from './types';

interface CalendarUi {
  view: CalView;
  /** Ngày neo của chế độ ngày / tuần / tháng (YYYY-MM-DD); null = hôm nay của workspace. */
  anchor: string | null;
  filter: CalFilter;
  detail: string | null;
  /** 'create' hoặc id lịch đang đổi giờ. */
  form: 'create' | { reschedule: string } | null;
  cancelFor: string | null;
  aiOpen: boolean;
  /** Giá trị điền sẵn (UiCommand prefill `appointment.form`, hoặc bấm ô trống ở lịch ngày / tuần). */
  prefill: Record<string, unknown> | null;
  /** Gợi ý tạo đơn sau khi hoàn thành buổi ngoài liệu trình (COMMERCE 8b). */
  suggestFor: string | null;
  setFilter: (p: Partial<CalFilter>) => void;
  set: (p: Partial<Omit<CalendarUi, 'set' | 'setFilter'>>) => void;
}

export const useCalendarUi = create<CalendarUi>((set) => ({
  view: 'list',
  anchor: null,
  filter: { team: 'all', staff_id: 'all', status: 'all', q: '' },
  detail: null,
  form: null,
  cancelFor: null,
  aiOpen: false,
  prefill: null,
  suggestFor: null,
  setFilter: (p) => set((s) => ({ filter: { ...s.filter, ...p } })),
  set: (p) => set(p),
}));
