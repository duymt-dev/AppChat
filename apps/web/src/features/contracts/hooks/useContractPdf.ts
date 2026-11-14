// "Tải PDF" hợp đồng (TIP-030): GET /v1/contracts/:id/pdf — đã ký = bản cuối có trang chứng nhận, đã duyệt & ký = bản đóng băng,
// nháp = render theo mẫu hiện tại (mock trả HTML). Mở tab trước khi tải để trình duyệt không chặn popup, rồi gán blob URL.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';

const REVOKE_MS = 60_000;

export function useContractPdf() {
  const t = useTranslations('contracts.detail');
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const open = async (id: string) => {
    const win = window.open('', '_blank');
    setBusy(true);
    try {
      const url = URL.createObjectURL(await transport.blob(`/contracts/${id}/pdf`));
      if (win) win.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } catch {
      win?.close();
      void message.error(t('pdfFail'));
    } finally {
      setBusy(false);
    }
  };
  return { open, busy };
}
