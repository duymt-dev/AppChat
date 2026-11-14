// Gợi ý danh mục ticket cho form / bộ lọc (TIP-034b §2): nhóm "Gợi ý" = bộ cấu hình (thứ tự cấu hình, nhãn đầu là mặc định) và nhóm "Đã dùng
// trong ticket" = nhãn của ticket người xem đang thấy (server lọc theo scope). Trang đầu lấy từ meta; "Tải thêm" mới đọc
// `/support/category-suggestions` theo cursor mờ. Khoá query gồm workspace → đổi workspace bỏ hết trang / cursor cũ, phản hồi muộn không lẫn.
'use client';
import { useEffect, useMemo, useState } from 'react';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import type { CategorySuggestions } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useMe } from '@/shared/shell/useShellData';
import type { TicketsMeta } from '../types';

export const categorySuggestionsQuery = (ws: string) =>
  infiniteQueryOptions({
    queryKey: ['tickets', 'category-suggestions', ws],
    queryFn: ({ pageParam }) => transport.get<CategorySuggestions>('/support/category-suggestions', pageParam ? { cursor: pageParam } : {}),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

/** Nhãn mặc định cho ticket mới: nhãn đầu của bộ cấu hình (không phải nhãn đã dùng). */
export const defaultCategory = (meta: TicketsMeta): string => meta.category_config?.default ?? meta.categories[0] ?? '';

export function useCategorySuggestions(meta: TicketsMeta | undefined) {
  const ws = useMe().data?.current_workspace_id ?? '';
  // Số trang muốn có theo workspace: 0 = chỉ meta; bấm "Tải thêm" → trang 1 (cùng meta) + trang kế. Đổi workspace → về 0.
  const [asked, setAsked] = useState({ ws, n: 0 });
  const want = asked.ws === ws ? asked.n : 0;
  const q = useInfiniteQuery({ ...categorySuggestionsQuery(ws), enabled: want > 0 && !!ws });
  const pages = q.data?.pages;
  useEffect(() => {
    if (pages && pages.length < want && q.hasNextPage && !q.isFetching) void q.fetchNextPage();
  }, [pages, want, q]);
  return useMemo(() => {
    const configured = pages?.[0]?.config.labels ?? meta?.category_config?.labels ?? meta?.categories ?? [];
    const own = new Set(configured);
    const used = [...new Set(pages ? pages.flatMap((p) => p.used) : (meta?.categories ?? []))].filter((l) => !own.has(l));
    const hasMore = pages ? q.hasNextPage : !!meta?.used_has_more;
    return { configured, used, hasMore, loading: q.isFetching, loadMore: () => setAsked({ ws, n: Math.max(want, pages?.length ?? 1) + 1 }) };
  }, [pages, meta, q.hasNextPage, q.isFetching, ws, want]);
}

export type CategoryOptions = ReturnType<typeof useCategorySuggestions>;
