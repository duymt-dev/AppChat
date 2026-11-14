// Ngữ cảnh màn Marketing cho Trợ lý (REQ-E06, TIP-023c G2.6): bản ghi đang mở — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useMarketingUi } from '../marketing-store';

export function useAssistantContext() {
  const id = useMarketingUi((s) => s.detail ?? s.focus);
  useRegisterScreenContext({ module: 'marketing', route: '/marketing', entity: 'campaign', id });
}
