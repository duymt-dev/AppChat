// Tìm trong hội thoại có trang (TIP-025b §B.3): gõ trễ 300ms; kết quả cũ → mới gộp từ các trang đã tải (id ổn định, không trùng);
// N/M lấy M = `total` của ảnh chụp (không phải số đã tải). Bước tới kết quả chưa tải → tải trang kế. Đổi câu / người gửi / hội thoại →
// về kết quả mới nhất của câu mới. Chọn kết quả = `jumpTo` (cửa sổ quanh tin — useThreadWindow).
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ThreadHitDto } from '@appchat/shared';
import { threadSearchPageQuery } from '../thread-api';

export function useThreadSearch(convId: string, raw: string, sender: string) {
  const [q, setQ] = useState(raw.trim());
  useEffect(() => {
    const t = setTimeout(() => setQ(raw.trim().slice(0, 100)), 300);
    return () => clearTimeout(t);
  }, [raw]);
  const query = useInfiniteQuery(threadSearchPageQuery(convId, q, sender));
  const hits = useMemo(() => {
    const seen = new Set<string>();
    const out: ThreadHitDto[] = [];
    for (const p of query.data?.pages ?? []) for (const h of p.data) if (!seen.has(h.message_id)) (seen.add(h.message_id), out.push(h));
    return out;
  }, [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  // Mặc định đứng ở kết quả MỚI NHẤT đã tải (gần tin hiện tại nhất); đổi câu → đặt lại (điều chỉnh khi render, không effect).
  const key = `${convId}|${q}|${sender}`;
  const [state, setState] = useState<{ key: string; i: number | null }>({ key, i: null });
  const cur = state.key === key ? state.i : null;
  const active = cur ?? (hits.length ? hits.length - 1 : 0);

  const step = (dir: 1 | -1) => {
    if (!total) return;
    const next = active + dir;
    if (next >= hits.length && query.hasNextPage) {
      void query.fetchNextPage().then(() => setState({ key, i: next }));
      return;
    }
    setState({ key, i: (next + hits.length) % hits.length });
  };

  return {
    q,
    hits,
    total,
    active,
    hit: hits[active] ?? null,
    step,
    loading: !!q && query.isFetching && !hits.length,
    error: query.isError,
  };
}
