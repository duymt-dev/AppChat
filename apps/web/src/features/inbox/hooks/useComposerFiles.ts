// Tệp chờ gửi của ô soạn (TIP-025): chọn tệp ("Thêm tệp" ở menu ＋) → tải lên ngay `POST /files` (purpose attachment) → giữ `file_id`;
// gửi tin kèm `attachments` (ảnh chụp màn hình đã chấp nhận cũng vào đây — TIP-025b §F.4). Lỗi tải lên báo toast; bỏ tệp trước khi gửi không xoá ở server (tệp chưa xác nhận — dọn job sau).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';

export interface PendingFile {
  key: string;
  name: string;
  file_id: string | null;
}

const MAX = 10;

export function useComposerFiles() {
  const t = useTranslations('inbox.composer');
  const { message: toast } = App.useApp();
  const [files, setFiles] = useState<PendingFile[]>([]);

  const add = async (list: FileList | File[] | null) => {
    for (const f of Array.from(list ?? []).slice(0, MAX - files.length)) {
      const key = `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`;
      setFiles((xs) => [...xs, { key, name: f.name, file_id: null }]);
      try {
        const up = await transport.upload(f, 'attachment');
        setFiles((xs) => xs.map((x) => (x.key === key ? { ...x, file_id: up.file_id } : x)));
      } catch {
        setFiles((xs) => xs.filter((x) => x.key !== key));
        toast.error(t('fileFailed', { name: f.name }));
      }
    }
  };

  return {
    files,
    add,
    remove: (key: string) => setFiles((xs) => xs.filter((x) => x.key !== key)),
    clear: () => setFiles([]),
    ready: files.every((f) => !!f.file_id),
    ids: files.map((f) => f.file_id).filter((x): x is string => !!x),
  };
}
