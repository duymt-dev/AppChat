// Nhập dữ liệu dùng chung (TIP-038b P4): panel + store mở panel (nút "Nhập" của màn, lệnh `open:transfer_plan` của Trợ lý qua host).
export { TransferPanel } from './components/TransferPanel';
export { isTransferEntity, openTransfer, useTransferUi } from './transfer-store';
export type { TransferEntity } from './types';
