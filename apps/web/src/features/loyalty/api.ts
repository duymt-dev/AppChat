// Đọc Khách thân thiết (Blueprint §4.4: GET /v1/loyalty/config, /loyalty/members?tier=&q=, /loyalty/members/:id). Ghi qua useAction (loyalty.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { LoyaltyConfig, LoyaltyOverview, Lookup, Member, MemberFilter } from './types';
import type { PageState, Paged } from '@/shared/list/paged';

export const membersQuery = (f: MemberFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['loyalty', 'members', f, pg],
    queryFn: () => transport.get<Paged<Member>>('/loyalty/members', { ...f, ...(f.q ? {} : { q: undefined }), ...pg }),
    placeholderData: (prev) => prev,
  });

export const memberQuery = (id: string) =>
  queryOptions({ queryKey: ['loyalty', 'member', id], queryFn: () => transport.get<Member>(`/loyalty/members/${id}`) });

export const loyaltyConfigQuery = () =>
  queryOptions({ queryKey: ['loyalty', 'config'], queryFn: () => transport.get<LoyaltyConfig>('/loyalty/config') });

export const loyaltyOverviewQuery = () =>
  queryOptions({ queryKey: ['loyalty', 'overview'], queryFn: () => transport.get<LoyaltyOverview>('/loyalty/overview') });

export const lookupMember = (phone: string) => transport.get<Lookup>('/loyalty/lookup', { phone });
