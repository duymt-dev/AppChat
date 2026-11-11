// Đọc Hợp đồng (Blueprint §4.4 contracts) + trang ký công khai. Ghi nội bộ qua useAction (contract.*);
// trang ký công khai: GET chỉ đọc + POST /public/sign/:token/* (server chuyển sang action riêng có capability — TIP-030c).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Contract, ContractFilter, ContractsMeta, SignView } from './types';
import type { PageState, Paged } from '@/shared/list/paged';
import { signingApi } from './signing-api';

export const contractsQuery = (f: ContractFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['contracts', 'list', f, pg],
    queryFn: () =>
      transport.get<Paged<Contract>>('/contracts', {
        status: f.status,
        owner_id: f.owner_id,
        ...(f.assigned_user_id && f.assigned_user_id !== 'all' ? { assigned_user_id: f.assigned_user_id } : {}),
        value: f.value,
        ...(f.q ? { q: f.q } : {}),
        ...pg,
      }),
    placeholderData: (prev) => prev,
  });

/** Hợp đồng gần nhất của một khách — REQ-F11 (6 nút Hồ sơ 360°). */
export const latestContractByContactQuery = (contactId: string) =>
  queryOptions({
    queryKey: ['contracts', 'by-contact', contactId],
    queryFn: () => transport.get<Paged<Contract>>('/contracts', { contact_id: contactId }),
    // Hồ sơ 360° ở Hộp thư: module chưa bật / chưa có endpoint → để trống, không gọi lại (TIP-025).
    retry: false,
    select: (r) => [...r.data].sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
  });

export const contractQuery = (id: string) =>
  queryOptions({
    queryKey: ['contracts', 'one', id],
    queryFn: () => transport.get<Contract>(`/contracts/${id}`),
  });

/** KPI + chip + panel AI; kèm `contractId` → thẻ CRM / nhận định / tệp của hợp đồng đó (drawer). */
export const contractsMetaQuery = (contractId?: string) =>
  queryOptions({
    queryKey: ['contracts', 'meta', contractId ?? null],
    queryFn: () => transport.get<ContractsMeta>('/contracts/meta', contractId ? { contract_id: contractId } : undefined),
  });

export const signViewQuery = (token: string) =>
  queryOptions({
    queryKey: ['sign', token],
    // TIP-030c: GET chỉ đọc; lượt mở chủ định là POST open riêng (useSignVisit) — refetch không ghi.
    queryFn: () => transport.get<SignView>(`/public/sign/${token}`),
    retry: false,
    staleTime: Infinity,
  });

/** POST công khai mang request_id ổn định (thử lại do mạng = cùng yêu cầu) — TIP-030c. */
export const signApi = signingApi('/public/sign');
