// Tạo nhóm Zalo (TIP-023b SPEC D): gửi `conversation.create_group` → nhận request `queued` (CHƯA phải nhóm đã tạo) → hỏi trạng thái
// GET /conversation-groups/:id tới khi xong. `unknown` = đã gọi Zalo mà không rõ kết quả — không báo thành công, không tự tạo lại.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupRequestDone, type GroupRequestDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';

export const groupRequestQuery = (id: string | null) => ({
  queryKey: ['conversation-groups', id] as const,
  queryFn: () => transport.get<GroupRequestDto>(`/conversation-groups/${id}`),
  enabled: !!id,
  refetchInterval: (q: { state: { data?: GroupRequestDto } }) => (q.state.data && groupRequestDone(q.state.data.status) ? false : 2000),
});

export function useCreateGroup() {
  const create = useAction<{ request_id: string; status: 'queued' }>('conversation.create_group');
  const [requestId, setRequestId] = useState<string | null>(null);
  const status = useQuery(groupRequestQuery(requestId));

  const submit = async (input: { channel_account_id: string; name: string; conversation_ids: string[] }) => {
    const r = await create.run(input, { silent: true });
    if (r?.result) setRequestId(r.result.request_id);
    return r;
  };

  return { submit, pending: create.isPending, requestId, request: status.data ?? null, reset: () => setRequestId(null) };
}
