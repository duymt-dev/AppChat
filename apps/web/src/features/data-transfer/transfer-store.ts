// Trạng thái mở TransferPanel (TIP-038b P4): một panel cho cả app, mount ở host `(app)/_data-transfer`. Nút "Nhập" của màn / lệnh UI
// `open:transfer_plan` của Trợ lý chỉ đặt store — không import component chéo feature.
import { create } from 'zustand';
import { TRANSFER_ENTITIES } from '@appchat/shared';
import type { TransferEntity, TransferOpen } from './types';

interface TransferUi {
  open: boolean;
  entity: TransferEntity;
  planId: string | null;
  show: (o: TransferOpen) => void;
  setPlan: (id: string | null) => void;
  close: () => void;
}

export const useTransferUi = create<TransferUi>((set) => ({
  open: false,
  entity: 'contact',
  planId: null,
  show: (o) => set((s) => ({ open: true, entity: o.entity ?? s.entity, planId: o.planId ?? null })),
  setPlan: (planId) => set({ planId }),
  close: () => set({ open: false, planId: null }),
}));

export const isTransferEntity = (v: string): v is TransferEntity => (TRANSFER_ENTITIES as readonly string[]).includes(v);

/** Mở panel từ ngoài React (ui-command / nút màn khác). */
export const openTransfer = (o: TransferOpen) => useTransferUi.getState().show(o);
