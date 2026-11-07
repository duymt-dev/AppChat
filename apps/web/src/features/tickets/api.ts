// Đọc Ticket (Blueprint §4.4 support: GET /v1/tickets, /tickets/:id, /tickets/meta). Ghi qua useAction (ticket.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Ticket, TicketFilter, TicketsMeta } from './types';
import type { PageState, Paged } from '@/shared/list/paged';
import { customParams } from '@/shared/custom-fields';

export const ticketsQuery = (f: TicketFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['tickets', 'list', f, pg],
    queryFn: () => {
      const { custom, ...rest } = f;
      return transport.get<Paged<Ticket>>('/tickets', { ...rest, ...(f.q ? {} : { q: undefined }), ...customParams(custom), ...pg });
    },
    placeholderData: (prev) => prev,
  });

export const ticketQuery = (id: string) =>
  queryOptions({ queryKey: ['tickets', 'one', id], queryFn: () => transport.get<Ticket>(`/tickets/${id}`) });

export const ticketsMetaQuery = () =>
  queryOptions({ queryKey: ['tickets', 'meta'], queryFn: () => transport.get<TicketsMeta>('/tickets/meta') });
