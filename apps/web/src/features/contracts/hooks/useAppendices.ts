// Phụ lục của hợp đồng (TIP-030b F3 spec 18): danh sách GET /contracts/:id/appendices (trạng thái, version, chứng cứ ký riêng) + mọi ghi qua
// useAction `contract.create_appendix` / `contract.appendix_*`. OTP Owner của phụ lục là action riêng (không dùng OTP hợp đồng cha).
// `request_key` sinh một lần mỗi lần mở form — bấm lưu hai lần / mạng chập chờn vẫn một phụ lục.
'use client';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import type { Appendix } from '../types';

export const appendicesQuery = (contractId: string) =>
  queryOptions({ queryKey: ['contracts', 'appendices', contractId], queryFn: () => transport.get<Appendix[]>(`/contracts/${contractId}/appendices`) });

export function useAppendices(contractId: string) {
  const list = useQuery(appendicesQuery(contractId));
  return {
    items: list.data ?? [],
    loading: list.isLoading,
    create: useAction('contract.create_appendix'),
    update: useAction('contract.appendix_update'),
    submit: useAction('contract.appendix_submit'),
    requestChanges: useAction('contract.appendix_request_changes'),
    ownerOtp: useAction<{ appendix_id: string; sent_to: string }>('contract.appendix_owner_otp'),
    approve: useAction('contract.appendix_approve_and_sign'),
    send: useAction<{ appendix_id: string; sign_url: string; expires_at: string }>('contract.appendix_send'),
  };
}

export type AppendixActions = ReturnType<typeof useAppendices>;
