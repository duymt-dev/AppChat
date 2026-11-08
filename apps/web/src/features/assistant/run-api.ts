// Đọc chi tiết run có scope (TIP-019b §5.2): GET /v1/runs/:id · /:id/steps · /:id/children (cursor). Làm mới theo WS `run.step` /
// `run.done` qua event-invalidation (khoá ['runs', …]) — không giữ state server song song.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { RunChild, RunDetail, RunPage, RunStep } from './run-types';

export const runDetailQuery = (id: string) =>
  queryOptions({ queryKey: ['runs', 'detail', id], queryFn: () => transport.get<{ data: RunDetail }>(`/runs/${id}`).then((r) => r.data) });

export const runStepsQuery = (id: string) =>
  infiniteQueryOptions({
    queryKey: ['runs', 'steps', id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => transport.get<RunPage<RunStep>>(`/runs/${id}/steps`, pageParam ? { cursor: pageParam } : {}),
    getNextPageParam: (p) => p.next_cursor,
  });

export const runChildrenQuery = (id: string) =>
  queryOptions({ queryKey: ['runs', 'children', id], queryFn: () => transport.get<RunPage<RunChild>>(`/runs/${id}/children`) });
