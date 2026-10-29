// Đọc Khách hàng (Blueprint §4.4 crm). Ghi chỉ qua useAction (packages/actions/src/crm.ts).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { AccessRequest, Collaborators, ContactRow, CrmAi, CrmStats, CustomField, Duplicates, Member, StageKey } from './types';

export interface ContactFilter {
  stage: StageKey;
  q: string;
  mine: boolean;
  status: string;
  owner_id: string;
  group: string;
  source: string;
}

const staticOpts = { staleTime: Infinity } as const;
const clean = (f: ContactFilter) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== false && v !== 'all'));

export const contactsQuery = (f: ContactFilter) =>
  queryOptions({ queryKey: ['crm', 'contacts', f], queryFn: () => transport.get<{ data: ContactRow[]; next_cursor: string | null }>('/contacts', clean(f)) });

export const crmStatsQuery = () => queryOptions({ queryKey: ['crm', 'stats'], queryFn: () => transport.get<CrmStats>('/contacts/stats'), ...staticOpts });

export const duplicatesQuery = () => queryOptions({ queryKey: ['crm', 'duplicates'], queryFn: () => transport.get<Duplicates>('/contacts/duplicates') });

export const customFieldsQuery = () => queryOptions({ queryKey: ['crm', 'fields'], queryFn: () => transport.get<CustomField[]>('/custom-fields') });

export const membersQuery = () => queryOptions({ queryKey: ['members'], queryFn: () => transport.get<Member[]>('/members'), ...staticOpts });

export const collaboratorsQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'collaborators', id], queryFn: () => transport.get<Collaborators>(`/contacts/${id}/collaborators`) });

export const accessRequestsQuery = () =>
  queryOptions({ queryKey: ['crm', 'access-requests'], queryFn: () => transport.get<AccessRequest[]>('/contact-access-requests') });

export const crmAiQuery = () => queryOptions({ queryKey: ['crm', 'ai'], queryFn: () => transport.get<CrmAi>('/crm/ai'), ...staticOpts });
