// Đọc Đơn hàng (Blueprint §4.4 orders). Ghi qua useAction (order.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Order, OrderFilter, OrdersMeta } from './types';
import type { PageState, Paged } from '@/shared/list/paged';

export const ordersQuery = (f: OrderFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['orders', 'list', f, pg],
    queryFn: () =>
      transport.get<Paged<Order>>('/orders', {
        chip: f.chip,
        owner_id: f.owner_id,
        value: f.value,
        source: f.source,
        ...(f.q ? { q: f.q } : {}),
        ...pg,
      }),
    placeholderData: (prev) => prev,
  });

export const orderQuery = (id: string) =>
  queryOptions({ queryKey: ['orders', 'one', id], queryFn: () => transport.get<Order>(`/orders/${id}`) });

export const ordersMetaQuery = () =>
  queryOptions({ queryKey: ['orders', 'meta'], queryFn: () => transport.get<OrdersMeta>('/orders/meta') });
