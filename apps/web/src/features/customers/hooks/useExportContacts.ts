// Nút "Xuất Excel" của màn Khách hàng (prototype L2462): contact.export theo đủ bộ lọc + thứ tự đang xem (đúng scope ở server — TIP-026)
// → tải tệp CSV (Excel mở được, có BOM UTF-8). Action risk read — chạy ngay, không qua preview.
'use client';
import { useAction } from '@/shared/actions/useAction';
import { useCrmUi } from '../crm-store';
import type { ContactFilter } from '../api';

type ExportResult = { file_name: string; mime: string; rows: number; content: string };

const save = (r: ExportResult) => {
  const url = URL.createObjectURL(new Blob([r.content], { type: r.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = r.file_name;
  a.click();
  URL.revokeObjectURL(url);
};

/** Bộ lọc màn hình → input contact.export (bỏ rỗng / mặc định). */
export function exportInput(f: ContactFilter) {
  const pick = { stage: f.stage === 'all' ? '' : f.stage, q: f.q, owner_id: f.owner_id, status: f.status, group: f.group, source: f.source, tag_id: f.tag_id, sort: f.sort === 'recent' ? '' : f.sort };
  return {
    ...Object.fromEntries(Object.entries(pick).filter(([, v]) => v)),
    ...(f.mine ? { mine: true } : {}),
    ...(f.custom && Object.keys(f.custom).length ? { custom: f.custom } : {}),
  };
}

export function useExportContacts() {
  const run = useAction<ExportResult>('contact.export');
  const f = useCrmUi((s) => s.filter);
  return async () => {
    const res = await run.run(exportInput(f), { silent: true });
    if (res) save(res.result);
  };
}
