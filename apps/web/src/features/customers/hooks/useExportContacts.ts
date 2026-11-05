// Nút "Xuất Excel" của màn Khách hàng (prototype L2462): contact.export theo đủ bộ lọc + thứ tự đang xem (đúng scope ở server — TIP-026)
// → tải tệp CSV (Excel mở được, có BOM UTF-8). Action risk read — không qua preview. > 5.000 khách (TIP-045b annex D): server trả 202
// job_accepted → theo dõi `/data-jobs/:id` tới khi xong rồi tải tệp qua link có xác thực (không cắt ngầm 5.000 dòng).
'use client';
import { useAction } from '@/shared/actions/useAction';
import { transport } from '@/shared/api/client';
import type { DataJobDto } from '@appchat/shared';
import { useCrmUi } from '../crm-store';
import type { ContactFilter } from '../api';

type ExportResult = { file_name: string; mime: string; rows: number; content: string };

const POLL_MS = 2000;
const POLL_MAX = 300;

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
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

/** Việc xuất nền: đợi tới khi kết thúc; xong + còn link → tải tệp. */
async function awaitJob(id: string) {
  for (let i = 0; i < POLL_MAX; i++) {
    const j = await transport.get<DataJobDto>(`/data-jobs/${id}`);
    if (j.status === 'completed' && j.download_url) return saveBlob(await transport.blob(j.download_url.replace(/^\/v1/, '')), j.file_name ?? 'khach-hang.csv');
    if (['completed', 'cancelled', 'failed'].includes(j.status)) return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

export function useExportContacts() {
  // Không im lặng: 202 hiện toast "đang chạy nền" (useAction) — thông báo xong việc đến qua chuông; 200 thì tệp tự tải (toast thừa).
  const run = useAction<ExportResult>('contact.export');
  const f = useCrmUi((s) => s.filter);
  return async () => {
    let job: string | null = null;
    const res = await run.run(exportInput(f), { onAccepted: (a) => a.status === 'job_accepted' && (job = a.job_id) });
    if (res) return saveBlob(new Blob([res.result.content], { type: res.result.mime }), res.result.file_name);
    if (job) await awaitJob(job);
  };
}
