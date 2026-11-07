// Ngữ cảnh màn Hỗ trợ cho Trợ lý (REQ-E06, TIP-023c G2.6): bản ghi đang mở + dòng đang chọn — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useTicketsUi } from '../tickets-store';

export function useAssistantContext() {
  const id = useTicketsUi((s) => s.detail);
  const selection = useTicketsUi((s) => s.selected);
  useRegisterScreenContext({ module: 'tickets', route: '/tickets', entity: 'ticket', id, selection });
}
