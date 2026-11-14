// Ngữ cảnh màn Khách hàng cho Trợ lý (REQ-E06): khách đang mở (drawer 360° / modal) + dòng đang chọn trong bảng — chỉ id.
'use client';
import type { Key } from 'react';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useCrmUi } from '../crm-store';

export function useAssistantContext(selected: readonly Key[]) {
  const id = useCrmUi((s) => s.detail ?? s.target);
  useRegisterScreenContext({ module: 'customers', route: '/customers', entity: 'contact', id, selection: selected.map(String) });
}
