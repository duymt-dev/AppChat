// Đọc cửa sổ luồng tin + tìm có trang (TIP-025b §B.1–3): trang tìm theo cursor mờ trong một ảnh chụp, cửa sổ ≤ 51 tin quanh kết quả,
// tải thêm tin mới hơn sau khi nhảy (`after`). Khoá gồm id hội thoại + câu tìm + người gửi — đổi là query mới, phản hồi của khoá cũ không bao giờ hiện.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ThreadAroundDto, ThreadSearchPageDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import type { Message } from './types';

export const threadKeys = {
  searchPage: (id: string, q: string, sender: string) => ['inbox', 'messages', id, 'search-page', { q, sender }] as const,
  around: (id: string, messageId: string) => ['inbox', 'messages', id, 'around', messageId] as const,
  after: (id: string, cursor: string) => ['inbox', 'messages', id, 'after', cursor] as const,
};

export const threadSearchPageQuery = (id: string, q: string, sender: string) =>
  infiniteQueryOptions({
    queryKey: threadKeys.searchPage(id, q, sender),
    queryFn: ({ pageParam }) => transport.get<ThreadSearchPageDto>(`/conversations/${id}/messages/search-page`, { q, sender, limit: 50, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled: !!q,
    staleTime: 30_000,
  });

export type ThreadAround = Omit<ThreadAroundDto, 'data'> & { data: Message[] };

export const threadAroundQuery = (id: string, messageId: string | null) =>
  queryOptions({
    queryKey: threadKeys.around(id, messageId ?? ''),
    queryFn: () => transport.get<ThreadAround>(`/conversations/${id}/messages/around/${messageId}`),
    enabled: !!messageId,
    staleTime: 30_000,
  });

/** Tin mới hơn mốc `cursor` (sau khi nhảy tới kết quả cũ). */
export const threadAfter = (id: string, cursor: string) =>
  transport.get<{ data: Message[]; after_cursor: string | null }>(`/conversations/${id}/messages`, { after: cursor });
