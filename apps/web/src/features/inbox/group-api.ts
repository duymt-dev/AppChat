// Đọc quản lý nhóm (TIP-025b §A): trạng thái nhóm (chính sách + phiên bản, số quan sát, ảnh chụp nhà cung cấp, thao tác hỗ trợ), ứng viên
// thêm thành viên (hội thoại 1-1 cùng tài khoản trong scope), trạng thái một lệnh nhóm (thăm dò tới khi kết thúc). Ghi qua useAction group.*.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { GroupCommandDto, GroupStateDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export const groupKeys = {
  state: (id: string) => ['inbox', 'group-state', id] as const,
  candidates: (id: string) => ['inbox', 'group-state', id, 'candidates'] as const,
  command: (id: string) => ['inbox', 'group-command', id] as const,
};

export const groupStateQuery = (id: string) => queryOptions({ queryKey: groupKeys.state(id), queryFn: () => transport.get<GroupStateDto>(`/conversations/${id}/group`) });

export const groupCandidatesQuery = (id: string, enabled: boolean) =>
  infiniteQueryOptions({
    queryKey: groupKeys.candidates(id),
    queryFn: ({ pageParam }) => transport.get<{ data: { conversation_id: string; title: string; contact_id: string | null }[]; next_cursor: string | null }>(`/conversations/${id}/group/candidates`, pageParam ? { cursor: pageParam } : {}),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled,
  });

export const groupCommandQuery = (id: string | null) =>
  queryOptions({
    queryKey: groupKeys.command(id ?? ''),
    queryFn: () => transport.get<GroupCommandDto>(`/inbox/group-commands/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && q.state.data.state !== 'pending' ? false : 2000),
  });
