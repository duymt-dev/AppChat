// Thống kê một agent (TIP-038 mục 2): GET /agents/:id/stats — cùng service với thẻ (danh sách đã kèm `stats` 30 ngày → dữ liệu ban đầu,
// không gọi lại mỗi thẻ). Kỳ khác mặc định → đọc lại theo from / to.
'use client';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { AgentStatsDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export const agentStatsQuery = (id: string, from?: string, to?: string) =>
  queryOptions({
    queryKey: ['agents', 'stats', id, from ?? '', to ?? ''],
    queryFn: () => transport.get<AgentStatsDto>(`/agents/${id}/stats`, { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
    staleTime: 60_000,
  });

export function useAgentStats(id: string, initial?: AgentStatsDto, window?: { from?: string; to?: string }) {
  const custom = !!(window?.from || window?.to);
  return useQuery({ ...agentStatsQuery(id, window?.from, window?.to), ...(initial && !custom ? { initialData: initial } : {}) });
}
