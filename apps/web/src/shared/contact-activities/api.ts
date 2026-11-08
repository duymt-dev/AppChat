// Đọc hoạt động CRM (TIP-026b §3.1) — dùng chung Hộp thư + Khách hàng (không import chéo feature). Key `crm` → mọi action hoạt động
// (invalidates `crm`) làm mới cả Hồ sơ 360° lẫn danh sách đầy đủ.
import { infiniteQueryOptions } from '@tanstack/react-query';
import type { ActivityKind, NoteItemDto, OpportunityItemDto, TaskItemDto } from '@appchat/shared';
import { transport } from '../api/client';

export type ActivityItem = NoteItemDto | TaskItemDto | OpportunityItemDto;
interface Page {
  data: ActivityItem[];
  next_cursor: string | null;
}

export const activitiesQuery = (contactId: string, kind: ActivityKind) =>
  infiniteQueryOptions({
    queryKey: ['crm', 'activities', contactId, kind],
    queryFn: ({ pageParam }) => transport.get<Page>(`/contacts/${contactId}/activities`, { kind, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.next_cursor,
  });
