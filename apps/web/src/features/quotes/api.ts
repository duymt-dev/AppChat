// Đọc Báo giá (Blueprint §4.4 sales). Ghi qua useAction (quote.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { PublicQuote } from '@appchat/shared';
import type { Quote, QuoteFilter, QuotesMeta } from './types';
import type { PageState, Paged } from '@/shared/list/paged';
import { customParams } from '@/shared/custom-fields';

export const quotesQuery = (f: QuoteFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['quotes', 'list', f, pg],
    queryFn: () =>
      transport.get<Paged<Quote>>('/quotes', {
        status: f.status,
        owner_id: f.owner_id,
        returning: f.returning,
        ...(f.q ? { q: f.q } : {}),
        ...customParams(f.custom),
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
    // Hồ sơ 360° ở Hộp thư: module chưa bật / chưa có endpoint → để trống, không gọi lại (TIP-025).
    retry: false,
    select: (r) => [...r.data].sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
  });

/** KPI + chip + panel AI; `quoteId` → kèm thẻ CRM / hoạt động / việc cần làm / lịch sử của báo giá đó (drawer). */
export const quotesMetaQuery = (quoteId?: string) =>
  queryOptions({
    queryKey: ['quotes', 'meta', quoteId ?? null],
    queryFn: () => transport.get<QuotesMeta>('/quotes/meta', quoteId ? { quote_id: quoteId } : undefined),
  });

/** Trang xem công khai (không đăng nhập) — mở link ghi nhận khách đã xem. */
export const publicQuoteQuery = (token: string) =>
  queryOptions({ queryKey: ['public-quote', token], queryFn: () => transport.get<PublicQuote>(`/public/quotes/${token}`), retry: false });
