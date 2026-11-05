// Ngữ cảnh màn Đơn hàng cho Trợ lý (REQ-E06, TIP-023c G2.6): bản ghi đang mở + dòng đang chọn — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useOrdersUi } from '../orders-store';

export function useAssistantContext() {
  const id = useOrdersUi((s) => s.detail);
  const selection = useOrdersUi((s) => s.selected);
  useRegisterScreenContext({ module: 'orders', route: '/orders', entity: 'order', id, selection });
}
