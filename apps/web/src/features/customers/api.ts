// Đọc Khách hàng (Blueprint §4.4 crm). Ghi chỉ qua useAction (packages/actions/src/crm.ts).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { ContactEditContextDto } from '@appchat/shared';
import type { AccessRequest, Collaborators, ContactRow, ContactSort, ContactsBoard, CrmAi, CrmStats, Duplicates, ImportTable, Member, StageKey } from './types';
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
  tag_id: string;
  sort: ContactSort;
  /** Lọc theo trường tuỳ biến (D56): key → giá trị. */
  custom?: Record<string, string>;
}

const staticOpts = { staleTime: Infinity } as const;
/** Bộ lọc → tham số query (bỏ rỗng / 'all' / sort mặc định). */
export const contactParams = ({ custom, ...f }: ContactFilter) => ({
  ...Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== '' && v !== false && v !== 'all' && !(k === 'sort' && v === 'recent'))),
  ...customParams(custom),
});

export const contactsQuery = (f: ContactFilter, pg?: PageState) =>
  queryOptions({ queryKey: ['crm', 'contacts', f, pg], queryFn: () => transport.get<Paged<ContactRow>>('/contacts', { ...contactParams(f), ...pg }) });

/** Kanban: bỏ lọc giai đoạn (mỗi cột một giai đoạn). */
export const contactsBoardQuery = (f: ContactFilter) =>
  queryOptions({ queryKey: ['crm', 'board', f], queryFn: () => transport.get<ContactsBoard>('/contacts/board', contactParams({ ...f, stage: 'all' })) });

export const importTableQuery = (fileId: string) =>
  queryOptions({ queryKey: ['crm', 'import-table', fileId], queryFn: () => transport.get<ImportTable>('/contacts/import-table', { file_id: fileId }), enabled: !!fileId, staleTime: Infinity, retry: false });

export const crmStatsQuery = () => queryOptions({ queryKey: ['crm', 'stats'], queryFn: () => transport.get<CrmStats>('/contacts/stats'), ...staticOpts });

export const duplicatesQuery = () => queryOptions({ queryKey: ['crm', 'duplicates'], queryFn: () => transport.get<Duplicates>('/contacts/duplicates') });

export const membersQuery = () => queryOptions({ queryKey: ['members'], queryFn: () => transport.get<Member[]>('/members'), ...staticOpts });

export const collaboratorsQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'collaborators', id], queryFn: () => transport.get<Collaborators>(`/contacts/${id}/collaborators`) });

export const accessRequestsQuery = () =>
  queryOptions({ queryKey: ['crm', 'access-requests'], queryFn: () => transport.get<AccessRequest[]>('/contact-access-requests') });

export const crmAiQuery = () => queryOptions({ queryKey: ['crm', 'ai'], queryFn: () => transport.get<CrmAi>('/crm/ai'), ...staticOpts });

/** Ngữ cảnh form sửa (TIP-025b §D.3): trường được thấy + version + quyền — luôn đọc mới khi mở form (không dùng cache cũ). */
export const contactEditQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'edit-context', id], queryFn: () => transport.get<ContactEditContextDto>(`/contacts/${id}/edit-context`), staleTime: 0, gcTime: 0 });
