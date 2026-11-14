// Đọc cơ hội (TIP-026c §4.1) — GET /v1/contacts/:id/opportunities (keyset) + GET /v1/opportunities/:id (drawer) + Hồ sơ 360° của khách
// (cùng key `['crm','contact',id]` với Hộp thư → dùng chung cache). Key bắt đầu `crm` → mọi action cơ hội / báo giá / đơn (invalidates
// `crm`) làm mới thẻ 360°, danh sách và drawer.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { Contact360Dto, OpportunityDetailDto, OpportunityItemDto } from '@appchat/shared';
import { transport } from '../api/client';

interface Page {
  data: OpportunityItemDto[];
  next_cursor: string | null;
}

export const opportunitiesQuery = (contactId: string) =>
  infiniteQueryOptions({
    queryKey: ['crm', 'opportunities', contactId],
    queryFn: ({ pageParam }) => transport.get<Page>(`/contacts/${contactId}/opportunities`, pageParam ? { cursor: pageParam } : {}),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.next_cursor,
  });

export const opportunityQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'opportunity', id], queryFn: () => transport.get<OpportunityDetailDto>(`/opportunities/${id}`) });

export const opportunityContactQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'contact', id], queryFn: () => transport.get<Contact360Dto>(`/contacts/${id}`), enabled: !!id });
