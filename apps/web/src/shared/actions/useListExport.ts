// Nút "Xuất" của 4 danh sách (TIP-038 pha 3): một hook chung — gọi `<list>.export` qua useAction với ĐÚNG bộ lọc đang xem (server xuất
// toàn bộ dòng khớp, không chỉ trang hiện tại). ≤ 50 dòng: tệp sẵn → tải ngay; > 50: 202 job_accepted → theo dõi `/data-jobs/:id` (tiến độ
// thật) tới khi xong rồi tải qua link có xác thực. Thất bại / huỷ / hết lượt chờ → báo lỗi + cho thử lại, không bao giờ toast thành công.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { ListExportKind, ListExportResult } from '@appchat/shared';
import { downloadJobFile as download, followJob } from './download';
import { useAction } from './useAction';

export type ExportState =
  { phase: 'idle' } | { phase: 'running'; done: number; total: number } | { phase: 'failed' };

/** Bộ lọc màn hình → input action: bỏ giá trị rỗng / `all`, trường tuỳ biến rỗng. */
export function exportInput(f: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === 'custom') {
      const c = Object.fromEntries(Object.entries((v ?? {}) as Record<string, string>).filter(([, x]) => x));
      if (Object.keys(c).length) out.custom = c;
    } else if (typeof v === 'string' && v && v !== 'all') out[k] = v;
  }
  return out;
}

export function useListExport(kind: ListExportKind) {
  const t = useTranslations('common.export');
  const { message } = App.useApp();
  const run = useAction<ListExportResult>(kind);
  const [state, setState] = useState<ExportState>({ phase: 'idle' });

  const follow = async (id: string) => {
    const n = await followJob(id, 'export.xlsx', (done, total) => setState({ phase: 'running', done, total }));
    if (n !== null) {
      setState({ phase: 'idle' });
      return void message.success(t('done', { n }));
    }
    setState({ phase: 'failed' });
    message.error(t('failed'));
  };

  const start = async (filter: object) => {
    if (state.phase === 'running') return;
    let job: string | null = null;
    setState({ phase: 'running', done: 0, total: 0 });
    try {
      const res = await run.run(exportInput(filter), {
        onAccepted: (a) => a.status === 'job_accepted' && (job = a.job_id),
      });
      if (res?.result.download_url) {
        await download(res.result.download_url, res.result.file_name);
        setState({ phase: 'idle' });
        return void message.success(t('done', { n: res.result.rows }));
      }
      if (job) return await follow(job);
      // Lỗi nghiệp vụ (quá trần, thiếu quyền…) đã toast ở useAction.
      setState({ phase: 'failed' });
    } catch {
      setState({ phase: 'failed' });
      message.error(t('failed'));
    }
  };

  const label =
    state.phase === 'running'
      ? state.total
        ? t('progress', { done: state.done, total: state.total })
        : t('running')
      : state.phase === 'failed'
        ? t('retry')
        : null;
  return { start, state, busy: state.phase === 'running', label };
}
