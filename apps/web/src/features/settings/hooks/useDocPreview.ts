// "Xem trước" mẫu chứng từ (TIP-028): GET /v1/doc-templates/:id/preview (PDF điền dữ liệu minh hoạ — server render bằng LibreOffice;
// mock trả HTML) → mở tab mới. Mở tab trước khi tải để trình duyệt không chặn popup, rồi gán blob URL khi có.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';

const REVOKE_MS = 60_000;

export function useDocPreview() {
  const t = useTranslations('settings.doctpl');
  const { message } = App.useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const open = async (id: string) => {
    const win = window.open('', '_blank');
    setBusy(id);
    try {
      const blob = await transport.blob(`/doc-templates/${id}/preview`);
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } catch {
      win?.close();
      void message.error(t('previewFail'));
    } finally {
      setBusy(null);
    }
  };
  return { open, busy };
}
