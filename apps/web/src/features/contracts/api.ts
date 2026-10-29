// Đọc Hợp đồng (Blueprint §4.4 contracts) + trang ký công khai. Ghi nội bộ qua useAction (contract.*);
// trang ký công khai là endpoint public ngoài Action Registry (POST /public/sign/:token/*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Contract, ContractFilter, ContractsMeta, SignView } from './types';
import type { PageState, Paged } from '@/shared/list/paged';

export const contractsQuery = (f: ContractFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['contracts', 'list', f, pg],
    queryFn: () =>
      transport.get<Paged<Contract>>('/contracts', {
        status: f.status,
        owner_id: f.owner_id,
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
    select: (r) => [...r.data].sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
  });

export const contractQuery = (id: string) =>
  queryOptions({
    queryKey: ['contracts', 'one', id],
    queryFn: () => transport.get<Contract>(`/contracts/${id}`),
  });

export const contractsMetaQuery = () =>
  queryOptions({
    queryKey: ['contracts', 'meta'],
    queryFn: () => transport.get<ContractsMeta>('/contracts/meta'),
  });

export const signViewQuery = (token: string) =>
  queryOptions({
    queryKey: ['sign', token],
    queryFn: () => transport.post<SignView>(`/public/sign/${token}/open`, {}),
    retry: false,
    staleTime: Infinity,
  });

export const signApi = {
  otp: (token: string) =>
    transport.post<{ channel: string; sent_to: string }>(`/public/sign/${token}/otp`, {}),
  sign: (token: string, body: { otp: string; signature_png: string; consent: true }) =>
    transport.post<SignView>(`/public/sign/${token}/sign`, body),
  decline: (token: string) => transport.post<SignView>(`/public/sign/${token}/decline`, {}),
};
