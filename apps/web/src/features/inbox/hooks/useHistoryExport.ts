// Nút CSV lịch sử ở Hồ sơ 360° (TIP-025b §D.6): gọi `contact.history_export` (crm.export) — ≤ 5.000 dòng tải ngay, > 5.000 theo dõi việc
// nền rồi tải qua link có xác thực. Đường tay không gọi model / không tốn Credit. Lỗi → báo + cho thử lại, không báo thành công giả.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { followJob, saveBlob } from '@/shared/actions/download';

type Out = { file_name: string; mime: string; rows: number; content: string };

export function useHistoryExport(contactId: string) {
  const t = useTranslations('common.export');
  const { message } = App.useApp();
  const run = useAction<Out>('contact.history_export');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    let job: string | null = null;
    try {
      const res = await run.run({ contact_id: contactId }, { onAccepted: (a) => a.status === 'job_accepted' && (job = a.job_id) });
      if (res) {
        saveBlob(new Blob([res.result.content], { type: `${res.result.mime};charset=utf-8` }), res.result.file_name);
        return void message.success(t('done', { n: res.result.rows }));
      }
      if (!job) return;
      const n = await followJob(job, 'history.csv');
      if (n === null) return void message.error(t('failed'));
      message.success(t('done', { n }));
    } catch {
      message.error(t('failed'));
    } finally {
      setBusy(false);
    }
  };
  return { start, busy };
}
