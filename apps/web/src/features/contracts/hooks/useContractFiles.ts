// Tệp của hợp đồng (TIP-030b spec 18): danh sách GET /contracts/:id/files + tải bytes thật qua transport có xác thực (không link công
// khai dài hạn); "Tải lên" gắn / thay tệp nguồn của hợp đồng nháp bằng contract.attach_file (CAS theo source_version).
'use client';
import { useState } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import type { Contract, ContractFileRow } from '../types';

export const contractFilesQuery = (id: string) =>
  queryOptions({ queryKey: ['contracts', 'files', id], queryFn: () => transport.get<ContractFileRow[]>(`/contracts/${id}/files`) });

const REVOKE_MS = 60_000;

export function useContractFiles(c: Contract) {
  const t = useTranslations('contracts.detail');
  const { message } = App.useApp();
  const files = useQuery(contractFilesQuery(c.id)).data ?? [];
  const attach = useAction('contract.attach_file');
  const [busy, setBusy] = useState(false);

  const download = async (f: ContractFileRow) => {
    try {
      const url = URL.createObjectURL(await transport.blob(`/contracts/${c.id}/files/${f.id}`));
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } catch {
      void message.error(t('fileFail'));
    }
  };

  /** Tải lên + gắn làm nguồn ký (chỉ nháp); lỗi guard hiện lý do, không giả đã lưu. */
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const up = await transport.upload(file, 'document');
      await attach.run({ contract_id: c.id, file_id: up.file_id, if_source_version: c.source_version ?? 1 });
    } catch {
      void message.error(t('fileFail'));
    } finally {
      setBusy(false);
    }
  };
  return { files, download, upload, busy, canAttach: c.status === 'draft' };
}
