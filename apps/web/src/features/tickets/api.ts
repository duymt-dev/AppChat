// Đọc Ticket (Blueprint §4.4 support: GET /v1/tickets, /tickets/:id, /tickets/meta). Ghi qua useAction (ticket.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Ticket, TicketFilter, TicketsMeta } from './types';

export const ticketsQuery = (f: TicketFilter) =>
  queryOptions({
    queryKey: ['tickets', 'list', f],
    queryFn: () => transport.get<{ data: Ticket[] }>('/tickets', { ...f, ...(f.q ? {} : { q: undefined }) }),
    placeholderData: (prev) => prev,
  });

export const ticketQuery = (id: string) =>
  queryOptions({ queryKey: ['tickets', 'one', id], queryFn: () => transport.get<Ticket>(`/tickets/${id}`) });

export const ticketsMetaQuery = () =>
  queryOptions({ queryKey: ['tickets', 'meta'], queryFn: () => transport.get<TicketsMeta>('/tickets/meta') });
