// Ngữ cảnh màn Hợp đồng cho Trợ lý (REQ-E06, TIP-023c G2.6): bản ghi đang mở + dòng đang chọn — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useContractsUi } from '../contracts-store';

export function useAssistantContext() {
  const id = useContractsUi((s) => s.detail);
  const selection = useContractsUi((s) => s.selected);
  useRegisterScreenContext({ module: 'contracts', route: '/contracts', entity: 'contract', id, selection });
}
