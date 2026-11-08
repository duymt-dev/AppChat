// Khung chung form hoạt động (TIP-026b §3.4): đọc bản ghi đang sửa từ CÙNG reader (activity_id → đúng version), bản nháp giữ nguyên khi
// 409 (thông báo đã có người sửa, tải version mới — người dùng xem rồi Lưu lại), đóng khi có thay đổi chưa lưu → hỏi bỏ.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ActivityKind, ApiRequestError } from '@appchat/shared';
import { transport } from '../api/client';
import { useActivityUi } from './activity-store';
import type { ActivityItem } from './api';

export function useActivityRow<T extends ActivityItem>(contactId: string, kind: ActivityKind, id?: string) {
  return useQuery({
    queryKey: ['crm', 'activities', contactId, kind, 'row', id],
    enabled: !!id,
    queryFn: async () => (await transport.get<{ data: ActivityItem[] }>(`/contacts/${contactId}/activities`, { kind, activity_id: id })).data[0] as T | undefined,
  });
}

export function useFormFrame<D extends object>(initial: D) {
  const t = useTranslations('common.activities');
  const close = useActivityUi((s) => s.closeForm);
  const [draft, setDraft] = useState(initial);
  const [base] = useState(initial);
  const [stale, setStale] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  return {
    draft,
    set: (p: Partial<D>) => setDraft((d) => ({ ...d, ...p })),
    dirty,
    stale,
    /** onError cho useAction: 409 → giữ nháp + cờ stale; lỗi khác để toast chung. */
    onError: (e: ApiRequestError) => {
      if (e.error.code !== 'STALE_VERSION') return false;
      setStale(true);
      return false;
    },
    clearStale: () => setStale(false),
    close: () => {
      if (dirty && !window.confirm(t('discard'))) return;
      close();
    },
    done: close,
  };
}
