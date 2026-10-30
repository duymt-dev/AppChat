// Nút "Xuất Excel" của màn Khách hàng (prototype L2462): contact.export theo bộ lọc đang xem (đúng scope ở server) → tải tệp CSV
// (Excel mở được, có BOM UTF-8). Action risk read — chạy ngay, không qua preview.
'use client';
import { useAction } from '@/shared/actions/useAction';
import { useCrmUi } from '../crm-store';

type ExportResult = { file_name: string; mime: string; rows: number; content: string };

const save = (r: ExportResult) => {
  const url = URL.createObjectURL(new Blob([r.content], { type: r.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = r.file_name;
  a.click();
  URL.revokeObjectURL(url);
};

export function useExportContacts() {
  const run = useAction<ExportResult>('contact.export');
  const f = useCrmUi((s) => s.filter);
  return async () => {
    const input = { ...(f.stage && f.stage !== 'all' ? { stage: f.stage } : {}), ...(f.q ? { q: f.q } : {}), ...(f.owner_id ? { owner_id: f.owner_id } : {}), ...(f.mine ? { mine: true } : {}) };
    const res = await run.run(input, { silent: true });
    if (res) save(res.result);
  };
}
