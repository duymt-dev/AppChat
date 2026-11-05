// Khối "AI ghi nhớ": đọc fact (≤ 50, mới nhất trước), xoá một fact qua `contact.memory_forget` (useAction — preview / Hoàn tác 24h theo
// action), "Tóm tắt lại" qua skill `contact.summarize` (refresh — tối đa một lần sinh mỗi lần bấm, kết quả `retry` khi dữ liệu vừa đổi).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAction } from '../actions/useAction';
import { contactMemoryQuery } from './api';

export interface Summary {
  bullets: string[];
  source: 'model' | 'rule';
  status: 'fresh' | 'cached' | 'retry';
}

export function useContactMemory(contactId: string) {
  const q = useQuery({ ...contactMemoryQuery(contactId), enabled: !!contactId });
  const forget = useAction('contact.memory_forget');
  const summarize = useAction<Summary>('contact.summarize');
  const [summary, setSummary] = useState<Summary | null>(null);
  return {
    data: q.data,
    loading: q.isLoading,
    forget: (memoryId: string) => forget.run({ memory_id: memoryId }),
    forgetting: forget.isPending,
    summary,
    summarizing: summarize.isPending,
    summarize: async (refresh = false) => {
      const r = await summarize.run({ contact_id: contactId, ...(refresh ? { refresh: true } : {}) }, { silent: true });
      if (r) setSummary(r.result);
    },
  };
}
