// Đọc Marketing (Blueprint §4.4 marketing: GET /v1/campaigns, /campaigns/:id, /campaigns/:id/recipients, /campaigns/meta, /segments,
// /campaign-suggestions, /campaign-analyses/:run_id). Ghi qua useAction (segment.* / campaign.*).
import { queryOptions } from '@tanstack/react-query';
import type { CampaignAnalysisDto, SegmentDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import type { Campaign, CampaignDetail, CampaignFilter, MarketingMeta, Recipient, Suggestion } from './types';
import type { PageState, Paged } from '@/shared/list/paged';

export const campaignsQuery = (f: CampaignFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['marketing', 'list', f, pg],
    queryFn: () => transport.get<Paged<Campaign>>('/campaigns', { ...f, ...(f.q ? {} : { q: undefined }), ...pg }),
    placeholderData: (prev) => prev,
  });

export const campaignQuery = (id: string) =>
  queryOptions({ queryKey: ['marketing', 'one', id], queryFn: () => transport.get<CampaignDetail>(`/campaigns/${id}`) });

/** Trang người nhận riêng (detail chỉ kèm trang đầu) — lọc theo trạng thái người nhận ở server. */
export const recipientsQuery = (id: string, status: string | undefined, pg: PageState) =>
  queryOptions({
    queryKey: ['marketing', 'recipients', id, status ?? 'all', pg],
    queryFn: () => transport.get<Paged<Recipient>>(`/campaigns/${id}/recipients`, { ...(status ? { status } : {}), ...pg }),
    placeholderData: (prev) => prev,
  });

export const marketingMetaQuery = () =>
  queryOptions({ queryKey: ['marketing', 'meta'], queryFn: () => transport.get<MarketingMeta>('/campaigns/meta') });

export const segmentsQuery = () => queryOptions({ queryKey: ['marketing', 'segments'], queryFn: () => transport.get<SegmentDto[]>('/segments') });

export const suggestionsQuery = () =>
  queryOptions({
    queryKey: ['marketing', 'suggestions'],
    queryFn: () => transport.get<Suggestion[]>('/campaign-suggestions'),
  });

/** Trạng thái lượt AI phân tích (worker ROLE=ai) — hỏi lại mỗi 2 giây tới khi xong / lỗi. */
export const analysisQuery = (runId: string) =>
  queryOptions({
    queryKey: ['marketing', 'analysis', runId],
    queryFn: () => transport.get<CampaignAnalysisDto>(`/campaign-analyses/${runId}`),
    refetchInterval: (q) => (q.state.data && ['completed', 'failed'].includes(q.state.data.status) ? false : 2000),
  });
