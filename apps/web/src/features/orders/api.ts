// Đọc Đơn hàng (Blueprint §4.4 orders). Ghi qua useAction (order.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Order, OrderFilter, OrdersMeta } from './types';

export const ordersQuery = (f: OrderFilter) =>
  queryOptions({
    queryKey: ['orders', 'list', f],
    queryFn: () =>
      transport.get<{ data: Order[] }>('/orders', {
        chip: f.chip,
        owner_id: f.owner_id,
        value: f.value,
        source: f.source,
        ...(f.q ? { q: f.q } : {}),
      }),
    placeholderData: (prev) => prev,
  });

export const orderQuery = (id: string) =>
  queryOptions({ queryKey: ['orders', 'one', id], queryFn: () => transport.get<Order>(`/orders/${id}`) });

export const ordersMetaQuery = () =>
  queryOptions({ queryKey: ['orders', 'meta'], queryFn: () => transport.get<OrdersMeta>('/orders/meta') });
