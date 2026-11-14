// Query runtime kết nối (TIP-012b P3 §5.1): GET /v1/integrations/connectors · /connections/:id · /logs (cursor). Ghi chỉ qua
// action `integration.sync_now` (useAction). Khoá query dưới `integrations` → invalidates của action làm mới.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { CallReceipt, ConnectionDetail, RuntimeConnector } from './integration-types';

export const runtimeConnectorsQuery = () =>
  queryOptions({ queryKey: ['integrations', 'runtime'], queryFn: () => transport.get<RuntimeConnector[]>('/integrations/connectors') });

export const connectionDetailQuery = (id: string) =>
  queryOptions({ queryKey: ['integrations', 'connection', id], queryFn: () => transport.get<ConnectionDetail>(`/integrations/connections/${id}`) });

export const connectionLogsQuery = (id: string) =>
  infiniteQueryOptions({
    queryKey: ['integrations', 'connection', id, 'logs'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => transport.get<{ data: CallReceipt[]; next_cursor: string | null }>(`/integrations/connections/${id}/logs`, { limit: 10, cursor: pageParam }),
    getNextPageParam: (p) => p.next_cursor ?? undefined,
  });
