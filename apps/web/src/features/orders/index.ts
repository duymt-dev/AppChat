// Public API của module orders.
export { OrdersScreen } from './screens/OrdersScreen';
export { ordersQuery } from './api';
// Dùng từ Hồ sơ 360° (REQ-F11: 6 nút mở form tại chỗ — Đơn hàng luôn tạo mới).
export { OrderFormModal } from './components/OrderFormModal';
export { useOrdersUi } from './orders-store';
export { prefillOrdersForm } from './ui-commands';
