// Cửa sổ luồng tin (TIP-025b §B.3): mặc định = trang mới nhất (threadQuery); nhảy tới kết quả tìm = cửa sổ ≤ 51 tin quanh tin đó, cuộn
// xuống tải tiếp tin mới hơn (`after`) — không lật tuần tự qua cả lịch sử. "Về tin mới nhất" khôi phục luồng thường. Đổi hội thoại → về
// luồng thường (hook gắn theo id). Tin ghép theo id ổn định (không trùng khi các trang chồng nhau).
'use client';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { threadQuery } from '../api';
import { threadAfter, threadAroundQuery } from '../thread-api';
import type { Message } from '../types';

const merge = (a: Message[], b: Message[]) => {
  const seen = new Set(a.map((m) => m.id));
  return [...a, ...b.filter((m) => !seen.has(m.id))];
};

export function useThreadWindow(convId: string) {
  const latest = useQuery(threadQuery(convId));
  const [jump, setJump] = useState<{ conv: string; id: string; extra: Message[]; after: string | null | undefined } | null>(null);
  const j = jump && jump.conv === convId ? jump : null;
  const around = useQuery(threadAroundQuery(convId, j?.id ?? null));
  const [loadingMore, setLoadingMore] = useState(false);

  const windowed = j && around.data ? merge(around.data.data, j.extra) : null;
  const after = j ? (j.after === undefined ? (around.data?.after_cursor ?? null) : j.after) : null;

  const jumpTo = useCallback((id: string) => setJump((s) => (s && s.conv === convId && s.id === id ? s : { conv: convId, id, extra: [], after: undefined })), [convId]);
  const backToLatest = useCallback(() => setJump(null), []);

  const loadNewer = async () => {
    if (!j || !after || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await threadAfter(convId, after);
      setJump((s) => (s && s.conv === convId ? { ...s, extra: merge(s.extra, r.data), after: r.after_cursor } : s));
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    messages: windowed ?? latest.data?.data ?? [],
    suggestion: latest.data?.suggestion ?? null,
    jumped: !!j,
    anchorId: j?.id ?? null,
    hasNewer: !!after,
    loadingWindow: !!j && around.isFetching && !around.data,
    windowError: !!j && around.isError,
    jumpTo,
    loadNewer,
    backToLatest,
  };
}
