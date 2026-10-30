// Đọc Khách hàng (Blueprint §4.4 crm). Ghi chỉ qua useAction (packages/actions/src/crm.ts).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { AccessRequest, Collaborators, ContactRow, CrmAi, CrmStats, Duplicates, Member, StageKey } from './types';
import type { PageState, Paged } from '@/shared/list/paged';
import { customParams } from '@/shared/custom-fields';

export interface ContactFilter {
  stage: StageKey;
  q: string;
  mine: boolean;
  status: string;
  owner_id: string;
  group: string;
  source: string;
  /** Lọc theo trường tuỳ biến (D56): key → giá trị. */
  custom?: Record<string, string>;
}

const staticOpts = { staleTime: Infinity } as const;
const clean = ({ custom, ...f }: ContactFilter) => ({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== false && v !== 'all')), ...customParams(custom) });

export const contactsQuery = (f: ContactFilter, pg?: PageState) =>
  queryOptions({ queryKey: ['crm', 'contacts', f, pg], queryFn: () => transport.get<Paged<ContactRow>>('/contacts', { ...clean(f), ...pg }) });

export const crmStatsQuery = () => queryOptions({ queryKey: ['crm', 'stats'], queryFn: () => transport.get<CrmStats>('/contacts/stats'), ...staticOpts });

export const duplicatesQuery = () => queryOptions({ queryKey: ['crm', 'duplicates'], queryFn: () => transport.get<Duplicates>('/contacts/duplicates') });

export const membersQuery = () => queryOptions({ queryKey: ['members'], queryFn: () => transport.get<Member[]>('/members'), ...staticOpts });

export const collaboratorsQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'collaborators', id], queryFn: () => transport.get<Collaborators>(`/contacts/${id}/collaborators`) });

export const accessRequestsQuery = () =>
  queryOptions({ queryKey: ['crm', 'access-requests'], queryFn: () => transport.get<AccessRequest[]>('/contact-access-requests') });

export const crmAiQuery = () => queryOptions({ queryKey: ['crm', 'ai'], queryFn: () => transport.get<CrmAi>('/crm/ai'), ...staticOpts });
