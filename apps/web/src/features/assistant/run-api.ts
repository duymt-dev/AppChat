// Đọc chi tiết run có scope (TIP-019b §5.2): GET /v1/runs/:id · /:id/steps · /:id/children (cursor). Làm mới theo WS `run.step` /
// `run.done` qua event-invalidation (khoá ['runs', …]) — không giữ state server song song.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { RunChild, RunDetail, RunPage, RunStep } from './run-types';

// TIP-020d: transport http đã bóc `{ data }` (mock trả nguyên phong bì) — nhận cả hai, không bóc hai lần (bóc hai lần → undefined → lỗi tải).
const detailOf = (r: RunDetail | { data: RunDetail }): RunDetail => ('data' in r && r.data && typeof r.data === 'object' ? r.data : (r as RunDetail));

export const runDetailQuery = (id: string) =>
  queryOptions({ queryKey: ['runs', 'detail', id], queryFn: () => transport.get<RunDetail | { data: RunDetail }>(`/runs/${id}`).then(detailOf) });

export const runStepsQuery = (id: string) =>
  infiniteQueryOptions({
    queryKey: ['runs', 'steps', id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => transport.get<RunPage<RunStep>>(`/runs/${id}/steps`, pageParam ? { cursor: pageParam } : {}),
    getNextPageParam: (p) => p.next_cursor,
  });

export const runChildrenQuery = (id: string) =>
  queryOptions({ queryKey: ['runs', 'children', id], queryFn: () => transport.get<RunPage<RunChild>>(`/runs/${id}/children`) });
