// Tải PDF đề nghị thanh toán gói AppChat (TIP-039 AC08): GET /v1/billing/invoices/:id/pdf (billing.manage; chứng từ nền tảng, không phải
// hoá đơn GTGT). Mở tab trước khi tải để trình duyệt không chặn popup, rồi gán blob URL; lỗi → báo, đóng tab trống (không giả thành công).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';

const REVOKE_MS = 60_000;

export function useInvoicePdf() {
  const t = useTranslations('settings.billing.inv');
  const { message } = App.useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const open = async (id: string) => {
    const win = window.open('', '_blank');
    setBusy(id);
    try {
      const url = URL.createObjectURL(await transport.blob(`/billing/invoices/${id}/pdf`));
      if (win) win.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } catch {
      win?.close();
      void message.error(t('pdfFail'));
    } finally {
      setBusy(null);
    }
  };
  return { open, busy };
}
