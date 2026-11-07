// Ngữ cảnh màn Báo giá cho Trợ lý (REQ-E06, TIP-023c G2.6): bản ghi đang mở + dòng đang chọn — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useQuotesUi } from '../quotes-store';

export function useAssistantContext() {
  const id = useQuotesUi((s) => s.detail);
  const selection = useQuotesUi((s) => s.selected);
  useRegisterScreenContext({ module: 'quotes', route: '/quotes', entity: 'quote', id, selection });
}
