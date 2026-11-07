// Public API của module contracts.
export { ContractsScreen } from './screens/ContractsScreen';
export { SignScreen } from './screens/SignScreen';
export { AppendixSignScreen } from './screens/AppendixSignScreen';
export { contractsQuery, latestContractByContactQuery, contractsMetaQuery } from './api';
export type { Contract, ContractStatus } from './types';
// Dùng từ Hồ sơ 360° (REQ-F11: 6 nút mở form tại chỗ; hợp đồng đã gửi ký → mở chi tiết chỉ xem, không rời Hộp thư).
export { ContractFormModal } from './components/ContractFormModal';
export { ContractDrawer } from './components/ContractDrawer';
export { useContractsUi } from './contracts-store';
export { prefillContractsForm } from './ui-commands';
