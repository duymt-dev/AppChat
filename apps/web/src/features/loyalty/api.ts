// Đọc Khách thân thiết (Blueprint §4.4: GET /v1/loyalty/config, /loyalty/overview, /loyalty/members?tier=&q=&page=&limit=, /loyalty/members/:id,
// /loyalty/members/:id/files, /loyalty/lookup). Phản hồi parse bằng zod chung (`@appchat/shared` — mock và http cùng hợp đồng). Ghi qua
// useAction (loyalty.* / payment.redeem_points).
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { loyaltyConfigSchema, loyaltyLookupSchema, loyaltyMemberFileSchema, loyaltyMemberSchema, loyaltyMembersPageSchema, loyaltyOverviewSchema } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import type { PageState } from '@/shared/list/paged';
import type { MemberFilter } from './types';

export const membersQuery = (f: MemberFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['loyalty', 'members', f, pg],
    queryFn: async () => loyaltyMembersPageSchema.parse(await transport.get('/loyalty/members', { ...f, ...(f.q ? {} : { q: undefined }), ...pg })),
    placeholderData: (prev) => prev,
  });

export const memberQuery = (id: string) =>
  queryOptions({ queryKey: ['loyalty', 'member', id], queryFn: async () => loyaltyMemberSchema.parse(await transport.get(`/loyalty/members/${id}`)) });

export const memberFilesQuery = (id: string) =>
  queryOptions({ queryKey: ['loyalty', 'member', id, 'files'], queryFn: async () => z.array(loyaltyMemberFileSchema).parse(await transport.get(`/loyalty/members/${id}/files`)) });

export const loyaltyConfigQuery = () =>
  queryOptions({ queryKey: ['loyalty', 'config'], queryFn: async () => loyaltyConfigSchema.parse(await transport.get('/loyalty/config')) });

export const loyaltyOverviewQuery = () =>
  queryOptions({ queryKey: ['loyalty', 'overview'], queryFn: async () => loyaltyOverviewSchema.parse(await transport.get('/loyalty/overview')) });

export const lookupMember = async (phone: string) => loyaltyLookupSchema.parse(await transport.get('/loyalty/lookup', { phone }));
