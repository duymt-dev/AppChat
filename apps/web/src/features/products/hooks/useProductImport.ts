// Nhập sản phẩm từ tệp (TIP-032b): tải tệp (purpose import) → ánh xạ cột (tên tiêu đề) → `product.import` qua useAction (bulk → xem trước
// ở ConfirmActionHost). ≤ 500 dòng: server chạy ngay; > 500 dòng: 202 `job_accepted` → giữ handle (import_id) và theo dõi trạng thái ở
// `/product-imports/:id` cho tới khi xong (polling chỉ đọc — không gọi lại action). Huỷ / chạy lại qua action riêng.
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { importDone, type ProductImportStatus } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';

export type ImportMapping = { name: string; price: string; sku?: string; type?: string; category?: string; unit?: string; tax_rate?: string };

const POLL_MS = 2000;

const csvHeader = (text: string) =>
  (text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '')
    .split(',')
    .map((c) => c.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);

export const productImportQuery = (id: string | null) => ({
  queryKey: ['catalog', 'import', id],
  queryFn: () => transport.get<ProductImportStatus>(`/product-imports/${id}`),
  enabled: !!id,
});

export function useProductImport() {
  const qc = useQueryClient();
  const importer = useAction<{ import_id: string }>('product.import');
  const cancel = useAction('product.import_cancel');
  const retry = useAction('product.import_retry');
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const status = useQuery({ ...productImportQuery(importId), refetchInterval: (q) => (q.state.data && importDone(q.state.data.status) ? false : POLL_MS) });

  /** Tải tệp; CSV trả tiêu đề cột (dòng đầu) để modal chỉ ánh xạ cột có thật — XLSX không đọc ở trình duyệt (null). */
  const upload = async (f: File): Promise<string[] | null> => {
    setUploading(true);
    try {
      const up = await transport.upload(f, 'import');
      setFile({ id: up.file_id, name: up.name });
      setImportId(null);
      return /\.csv$/i.test(f.name) ? csvHeader(await f.slice(0, 4096).text()) : null;
    } finally {
      setUploading(false);
    }
  };

  const run = async (mapping: ImportMapping) => {
    if (!file) return;
    const accepted: { id?: string } = {};
    const res = await importer.run({ file_id: file.id, mapping }, { onAccepted: (a) => a.status === 'job_accepted' && (accepted.id = a.job_id) });
    const id = res?.result.import_id ?? accepted.id ?? null;
    if (id) setImportId(id);
    await qc.invalidateQueries({ queryKey: ['catalog'] });
  };

  return {
    file,
    uploading,
    upload,
    run,
    pending: importer.isPending,
    importId,
    status: status.data ?? null,
    cancel: () => importId && cancel.run({ import_id: importId }),
    retry: () => importId && retry.run({ import_id: importId }),
    reset: () => {
      setFile(null);
      setImportId(null);
    },
  };
}
