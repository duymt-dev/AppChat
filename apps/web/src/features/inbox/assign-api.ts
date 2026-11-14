// Ứng viên phụ trách (TIP-025b §B.6): người + agent đang chạy đúng kênh kèm tải mở, theo trang; cần inbox.assign. Ghi vẫn qua conversation.assign.
import { infiniteQueryOptions } from '@tanstack/react-query';
import type { AssigneeCandidatesDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export const assigneesQuery = (id: string, q: string, enabled: boolean) =>
  infiniteQueryOptions({
    queryKey: ['inbox', 'assignees', id, q] as const,
    queryFn: ({ pageParam }) => transport.get<AssigneeCandidatesDto>(`/conversations/${id}/assignees`, { ...(q ? { q } : {}), ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled,
  });
