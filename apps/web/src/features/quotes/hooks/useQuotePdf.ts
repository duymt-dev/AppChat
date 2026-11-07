// "Tải PDF" của báo giá (TIP-029): GET /v1/quotes/:id/pdf — đã gửi = bản đóng băng lúc gửi, chưa gửi = bản nháp theo mẫu hiện tại
// (server render bằng LibreOffice; mock trả HTML). Mở tab trước khi tải để trình duyệt không chặn popup, rồi gán blob URL.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';

const REVOKE_MS = 60_000;

export function useQuotePdf() {
  const t = useTranslations('quotes.detail');
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const open = async (id: string) => {
    const win = window.open('', '_blank');
    setBusy(true);
    try {
      const url = URL.createObjectURL(await transport.blob(`/quotes/${id}/pdf`));
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
