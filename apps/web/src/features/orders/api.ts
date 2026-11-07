// Đọc Đơn hàng (Blueprint §4.4 orders). Ghi qua useAction (order.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Order, OrderFilter, OrdersMeta } from './types';
import type { PageState, Paged } from '@/shared/list/paged';
import { customParams } from '@/shared/custom-fields';

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
        ...customParams(f.custom),
        ...pg,
      }),
    placeholderData: (prev) => prev,
  });

export const orderQuery = (id: string) =>
  queryOptions({ queryKey: ['orders', 'one', id], queryFn: () => transport.get<Order>(`/orders/${id}`) });

/** `orderId` → kèm thẻ CRM / nhận định / tệp của đơn đó (drawer). */
export const ordersMetaQuery = (orderId?: string) =>
  queryOptions({
    queryKey: ['orders', 'meta', orderId ?? null],
    queryFn: () => transport.get<OrdersMeta>('/orders/meta', orderId ? { order_id: orderId } : undefined),
  });
