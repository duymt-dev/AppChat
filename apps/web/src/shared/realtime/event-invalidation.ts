// Realtime event → invalidate cache (không giữ state server song song). Mock phát qua onMockEvent.
'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiMode } from '../api/transport';
import { onMockEvent } from '../api/mock/store';
import { qk } from '../api/query-keys';

const EVENT_KEYS: Record<string, readonly (readonly unknown[])[]> = {
  // đổi vai trò = đổi data scope → danh sách theo scope phải tải lại
  'authz.changed': [qk.authz(), ['crm'], ['inbox']],
  'notification.new': [qk.notifications()],
};

export function useEventInvalidation() {
  const qc = useQueryClient();
  useEffect(() => {
    if (apiMode() !== 'mock') return;
    const off = onMockEvent((event) => {
      for (const key of EVENT_KEYS[event] ?? []) void qc.invalidateQueries({ queryKey: key });
    });
    return () => {
      off();
    };
  }, [qc]);
}
