// Đọc kế hoạch Cowork (TIP-023d §6) — ghi đi qua useAction (plan_request_edit / plan_update / plan_resume / plan_reuse).
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { AgentChoice, Plan, ReuseCandidate } from './types';

/** Kế hoạch mới nhất của phiên — server chiếu tiến độ thật (biên nhận), không phải lời model. */
export const sessionPlanQuery = (sessionId: string | undefined) =>
  queryOptions({
    queryKey: ['assistant', 'plan', sessionId ?? ''],
    queryFn: () => transport.get<{ data: Plan | null }>(`/assistant/sessions/${encodeURIComponent(sessionId!)}/plan`).then((r) => r.data),
    enabled: !!sessionId,
  });

/** Gợi ý tái dùng của chính người dùng (xếp hạng tất định ở server) — không trùng → rỗng. */
export const reusableQuery = (text: string) =>
  queryOptions({
    queryKey: ['assistant', 'plan-reusable', text],
    queryFn: () => transport.action<{ candidates: ReuseCandidate[] }>('assistant.plan_reusable', { limit: 3, ...(text.trim() ? { text: text.trim().slice(0, 500) } : {}) }).then((r) => (r.status === 200 ? r.data.result.candidates : [])),
    staleTime: 30_000,
  });

/** Trang agent chọn được (keyset, mặc định 30) — nhiều hơn 12 thẻ màn chào. */
export const agentChoicesQuery = () =>
  infiniteQueryOptions({
    queryKey: ['assistant', 'agent-choices'],
    queryFn: ({ pageParam }) => transport.get<{ data: AgentChoice[]; next_cursor: string | null }>('/assistant/agent-choices', pageParam ? { cursor: pageParam } : {}),
    initialPageParam: '' as string,
    getNextPageParam: (p) => p.next_cursor ?? undefined,
  });
