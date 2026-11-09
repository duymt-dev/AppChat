// Trạng thái mở TransferPanel (TIP-038b P4): một panel cho cả app, mount ở host `(app)/_data-transfer`. Nút "Nhập" của màn / lệnh UI
// `open:transfer_plan` của Trợ lý chỉ đặt store — không import component chéo feature.
import { create } from 'zustand';
import { TRANSFER_ENTITIES } from '@appchat/shared';
import type { TransferDataset, TransferEntity, TransferOpen } from './types';

interface TransferUi {
  open: boolean;
  entity: TransferEntity;
  /** Tập chọn ở bước chọn tệp (TIP-026b §5) — kế hoạch đã lập dùng tập ĐÃ LƯU của server, không đọc lại giá trị này. */
  dataset: TransferDataset;
  planId: string | null;
  show: (o: TransferOpen) => void;
  setPlan: (id: string | null) => void;
  close: () => void;
}

export const useTransferUi = create<TransferUi>((set) => ({
  open: false,
  entity: 'contact',
  dataset: 'base',
  planId: null,
  // Đổi thực thể → về tập base (tập con chỉ thuộc khách); mở kế hoạch có sẵn không đổi lựa chọn.
  show: (o) =>
    set((s) => {
      const entity = o.entity ?? s.entity;
      const dataset = o.dataset ?? (entity === s.entity ? s.dataset : 'base');
      return { open: true, entity, dataset: entity === 'contact' ? dataset : 'base', planId: o.planId ?? null };
    }),
  setPlan: (planId) => set({ planId }),
  close: () => set({ open: false, planId: null }),
}));

export const isTransferEntity = (v: string): v is TransferEntity => (TRANSFER_ENTITIES as readonly string[]).includes(v);

/** Mở panel từ ngoài React (ui-command / nút màn khác). */
export const openTransfer = (o: TransferOpen) => useTransferUi.getState().show(o);
