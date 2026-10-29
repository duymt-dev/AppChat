// UI state Đề nghị thanh toán: tìm kiếm, drawer + tab, form tạo, ghi nhận thanh toán, huỷ, hàng "Cần đối soát".
import { create } from 'zustand';

interface InvoicesUi {
  q: string;
  detail: string | null;
  tab: string;
  form: 'create' | null;
  /** Đề nghị đang mở hộp "Ghi nhận thanh toán". */
  recordFor: string | null;
  voidFor: string | null;
  reconcileOpen: boolean;
  /** Giá trị điền sẵn cho form (UiCommand prefill `invoice.form`, hoặc từ đơn hàng `?order=`). */
  prefill: Record<string, unknown> | null;
  set: (p: Partial<Omit<InvoicesUi, 'set'>>) => void;
}

export const useInvoicesUi = create<InvoicesUi>((set) => ({
  q: '',
  detail: null,
  tab: 'overview',
  form: null,
  recordFor: null,
  voidFor: null,
  reconcileOpen: false,
  prefill: null,
  set: (p) => set(p),
}));
