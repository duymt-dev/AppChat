// Theo dõi lệnh thao tác kênh vừa nhận (TIP-014b A): sau 202 job_accepted của message.recall / message.react, đọc
// `/inbox/channel-operations/:id` tới khi hết `pending` rồi làm mới luồng tin. Không coi 202 là đã xong. Đổi workspace xoá cache query
// (UserMenu `qc.clear()`) và id lệnh nằm trong state cục bộ của menu — trạng thái workspace cũ không còn hiện. Dừng hỏi khi hết pending.
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChannelOperationDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { inboxKeys } from '../api';

const POLL_MS = 1500;

export function useMessageProviderStatus(convId: string, operationId: string | null) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['inbox', 'channel-operation', operationId],
    queryFn: () => transport.get<ChannelOperationDto>(`/inbox/channel-operations/${operationId}`),
    enabled: !!operationId,
    refetchInterval: (query) => (query.state.data && query.state.data.state !== 'pending' ? false : POLL_MS),
  });
  const state = q.data?.state;
  useEffect(() => {
    if (state && state !== 'pending') void qc.invalidateQueries({ queryKey: inboxKeys.thread(convId) });
  }, [state, convId, qc]);
  return q.data ?? null;
}
