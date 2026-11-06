// UI state Gói & ví (frontend-structure §5: zustand chỉ giữ trạng thái giao diện; dữ liệu ở TanStack Query).
import { create } from 'zustand';
import type { PlanSeg } from './types';

interface BillingUi {
  /** Phân khúc thẻ gói (Cá nhân / Doanh nghiệp). */
  seg: PlanSeg;
  /** Phân khúc bảng so sánh (tách riêng như prototype). */
  cmpSeg: PlanSeg;
  /** Nhóm đang thu gọn trong bảng so sánh. */
  cmpClosed: string[];
  upgradeOpen: boolean;
  creditOpen: boolean;
  /** Hộp "Liên hệ" gói Doanh nghiệp (`billing.contact_sales`). */
  contactOpen: boolean;
  /** Gói đang xác nhận mua / đổi (PlanChangeModal — giá server tính qua /billing/quote). */
  planChange: string | null;
  /** Hoá đơn đang mở (QR thanh toán hoặc xem chi tiết). */
  invoiceId: string | null;
  walTab: 'topup' | 'history' | 'invoice';
  shopTab: 'credit' | 'addon';
  invStatus: string;
  invQ: string;
  invFrom: string;
  invTo: string;
  set: (p: Partial<Omit<BillingUi, 'set'>>) => void;
}

export const useBillingUi = create<BillingUi>((setState) => ({
  seg: 'personal',
  cmpSeg: 'personal',
  cmpClosed: [],
  upgradeOpen: false,
  creditOpen: false,
  contactOpen: false,
  planChange: null,
  invoiceId: null,
  walTab: 'topup',
  shopTab: 'credit',
  invStatus: 'all',
  invQ: '',
  invFrom: '',
  invTo: '',
  set: (p) => setState(p),
}));
