// UI state Đề nghị thanh toán: tìm kiếm, drawer + tab, form tạo, ghi nhận thanh toán, huỷ, hoàn tiền, hàng "Cần đối soát" (+ hoàn tiền chờ duyệt).
import { create } from 'zustand';
import { FIRST_PAGE, type PageState } from '@/shared/list/paged';

interface InvoicesUi {
  q: string;
  /** Trang bảng (D42) — đổi ô tìm thì về trang 1. */
  pg: PageState;
  detail: string | null;
  tab: string;
  form: 'create' | null;
  /** Đề nghị đang mở hộp "Ghi nhận thanh toán". */
  recordFor: string | null;
  voidFor: string | null;
  /** Đề nghị đang mở hộp "Yêu cầu hoàn tiền". */
  refundFor: string | null;
  reconcileOpen: boolean;
  /** Giá trị điền sẵn cho form (UiCommand prefill `invoice.form`, hoặc từ đơn hàng `?order=`). */
  prefill: Record<string, unknown> | null;
  set: (p: Partial<Omit<InvoicesUi, 'set'>>) => void;
}

export const useInvoicesUi = create<InvoicesUi>((set) => ({
  q: '',
  pg: FIRST_PAGE,
  detail: null,
  tab: 'overview',
  form: null,
  recordFor: null,
  voidFor: null,
  refundFor: null,
  reconcileOpen: false,
  prefill: null,
  set: (p) => set((s) => ('q' in p && p.q !== s.q ? { ...p, pg: { ...s.pg, page: 1 } } : p)),
}));
