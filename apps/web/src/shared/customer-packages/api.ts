// Đọc liệu trình (TIP-033b §4.4): GET /contacts/:id/packages ({ data, next_cursor }). Khoá ['packages', khách] — sự kiện package.* /
// appointment.* và action liệu trình (invalidates `packages`) làm mới; đổi khách = khoá khác (không lẫn dữ liệu).
import { infiniteQueryOptions } from '@tanstack/react-query';
import { transport } from '../api/client';
import type { CustomerPackagesPage } from './types';

export const customerPackagesQuery = (contactId: string) =>
  infiniteQueryOptions({
    queryKey: ['packages', 'contact', contactId],
    queryFn: ({ pageParam }) => transport.get<CustomerPackagesPage>(`/contacts/${contactId}/packages`, pageParam ? { cursor: pageParam } : undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.next_cursor,
  });
