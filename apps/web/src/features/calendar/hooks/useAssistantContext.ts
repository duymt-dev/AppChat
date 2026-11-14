// Ngữ cảnh màn Lịch hẹn cho Trợ lý (REQ-E06, TIP-023c G2.6): bản ghi đang mở — chỉ id; shared không import feature.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';
import { useCalendarUi } from '../calendar-store';

export function useAssistantContext() {
  const id = useCalendarUi((s) => s.detail);
  useRegisterScreenContext({ module: 'calendar', route: '/calendar', entity: 'appointment', id });
}
