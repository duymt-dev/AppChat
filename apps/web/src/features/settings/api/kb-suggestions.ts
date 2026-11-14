// Đọc hàng chờ "AI đã học — chờ duyệt" (TIP-043, `GET /v1/kb/suggestions?status=&cursor=&limit=` + `/:id`): envelope `{ data,
// next_cursor, meta.pending }` khớp `kbSuggestionListSchema` (packages/shared). Ghi qua useAction('kb.suggestion.approve' | 'reject')
// — invalidates `kb_suggestions` + `kb` làm mới hàng chờ và danh sách tài liệu.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { KbSuggestionDto, KbSuggestionListDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export type KbSuggestionStatus = KbSuggestionDto['status'];
const PAGE = 20;

export const kbSuggestionsQuery = (status: KbSuggestionStatus) =>
  infiniteQueryOptions({
    queryKey: ['kb_suggestions', 'list', status],
    queryFn: ({ pageParam }) => transport.get<KbSuggestionListDto>('/kb/suggestions', { status, limit: PAGE, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

/** Số chờ duyệt cho nav (một trang nhỏ, dùng `meta.pending`). */
export const kbPendingCountQuery = () =>
  queryOptions({
    queryKey: ['kb_suggestions', 'pending-count'],
    queryFn: async () => (await transport.get<KbSuggestionListDto>('/kb/suggestions', { status: 'pending', limit: 1 })).meta.pending,
  });

export const kbSuggestionQuery = (id: string) => queryOptions({ queryKey: ['kb_suggestions', 'one', id], queryFn: () => transport.get<KbSuggestionDto>(`/kb/suggestions/${id}`) });
