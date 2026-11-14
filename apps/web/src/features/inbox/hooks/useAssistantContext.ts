// Ngữ cảnh màn Hộp thư cho Trợ lý (REQ-E06, TIP-023c G2.6): hội thoại đang mở — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useInboxUi } from '../inbox-store';

export function useAssistantContext() {
  const id = useInboxUi((s) => s.selectedId) || null;
  useRegisterScreenContext({ module: 'inbox', route: '/inbox', entity: 'conversation', id });
}
