// Đọc Marketing (Blueprint §4.4 marketing: GET /v1/campaigns, /campaigns/:id, /campaigns/meta, /campaign-suggestions). Ghi qua useAction (campaign.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Campaign, CampaignDetail, CampaignFilter, MarketingMeta, Suggestion } from './types';

export const campaignsQuery = (f: CampaignFilter) =>
  queryOptions({
    queryKey: ['marketing', 'list', f],
    queryFn: () => transport.get<{ data: Campaign[] }>('/campaigns', { ...f, ...(f.q ? {} : { q: undefined }) }),
    placeholderData: (prev) => prev,
  });

export const campaignQuery = (id: string) =>
  queryOptions({ queryKey: ['marketing', 'one', id], queryFn: () => transport.get<CampaignDetail>(`/campaigns/${id}`) });

export const marketingMetaQuery = () =>
  queryOptions({ queryKey: ['marketing', 'meta'], queryFn: () => transport.get<MarketingMeta>('/campaigns/meta') });

export const suggestionsQuery = () =>
  queryOptions({
    queryKey: ['marketing', 'suggestions'],
    queryFn: () => transport.get<{ data: Suggestion[] }>('/campaign-suggestions'),
  });
