// Trình duyệt phiên Trợ lý (REQ-E10a, TIP-023c G2.8a): `GET /assistant/sessions?q=&cursor=` — keyset theo người gọi, tìm có debounce
// 300ms, tải thêm theo `next_cursor` (trang ổn định khi có phiên mới). Khoá query gồm workspace → đổi workspace không lẫn phiên.
'use client';
import { useEffect, useState } from 'react';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import type { AssistantSessionDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useMe } from '@/shared/shell/useShellData';

export const SESSIONS_DEBOUNCE_MS = 300;
const PAGE = 20;

export const sessionsQuery = (ws: string, q: string) =>
  infiniteQueryOptions({
    queryKey: ['assistant', 'sessions', ws, q],
    queryFn: ({ pageParam }) =>
      transport.get<{ data: AssistantSessionDto[]; next_cursor: string | null }>('/assistant/sessions', { limit: PAGE, ...(q ? { q } : {}), ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

export function useAssistantSessions(open: boolean) {
  const ws = useMe().data?.current_workspace_id ?? '';
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const h = setTimeout(() => setQ(text.trim().slice(0, 100)), SESSIONS_DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [text]);
  const list = useInfiniteQuery({ ...sessionsQuery(ws, q), enabled: open });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  return { text, setText, q, rows, list };
}
