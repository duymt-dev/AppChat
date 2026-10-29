// Đọc Báo giá (Blueprint §4.4 sales). Ghi qua useAction (quote.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Quote, QuoteFilter, QuotesMeta } from './types';
import type { PageState, Paged } from '@/shared/list/paged';

export const quotesQuery = (f: QuoteFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['quotes', 'list', f, pg],
    queryFn: () =>
      transport.get<Paged<Quote>>('/quotes', {
        status: f.status,
        owner_id: f.owner_id,
        returning: f.returning,
        ...(f.q ? { q: f.q } : {}),
        ...pg,
      }),
    placeholderData: (prev) => prev,
  });

export const quoteQuery = (id: string) =>
  queryOptions({ queryKey: ['quotes', 'one', id], queryFn: () => transport.get<Quote>(`/quotes/${id}`) });

export const quoteVersionsQuery = (id: string) =>
  queryOptions({
    queryKey: ['quotes', 'versions', id],
    queryFn: () => transport.get<Quote[]>(`/quotes/${id}/versions`),
  });

export const quotesMetaQuery = () =>
  queryOptions({ queryKey: ['quotes', 'meta'], queryFn: () => transport.get<QuotesMeta>('/quotes/meta') });
