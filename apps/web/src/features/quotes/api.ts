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

/** Báo giá gần nhất (còn hiển thị, không superseded/deleted) của một khách — REQ-F11 (6 nút Hồ sơ 360°). */
export const latestQuoteByContactQuery = (contactId: string) =>
  queryOptions({
    queryKey: ['quotes', 'by-contact', contactId],
    queryFn: () => transport.get<Paged<Quote>>('/quotes', { contact_id: contactId }),
    select: (r) => [...r.data].sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
  });

export const quotesMetaQuery = () =>
  queryOptions({ queryKey: ['quotes', 'meta'], queryFn: () => transport.get<QuotesMeta>('/quotes/meta') });
