// Tải tệp xuất về máy (TIP-038 / TIP-025b §D.6): lưu blob, tải qua link có xác thực `/v1/data-jobs/:id/download`, theo dõi việc nền tới
// khi xong. Hook xuất (danh sách, lịch sử khách) dùng chung — không URL storage thô.
import type { DataJobDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

const POLL_MS = 1500;
const POLL_MAX = 400;

export const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadJobFile = async (url: string, name: string) => saveBlob(await transport.blob(url.replace(/^\/v1/, '')), name);

/** Theo dõi việc nền: xong có tệp → tải + trả số dòng; huỷ / lỗi / hết lượt chờ → null. `onProgress` cho nhãn tiến độ. */
export async function followJob(id: string, fallbackName: string, onProgress?: (done: number, total: number) => void): Promise<number | null> {
  for (let i = 0; i < POLL_MAX; i++) {
    const j = await transport.get<DataJobDto>(`/data-jobs/${id}`);
    if (j.status === 'completed' && j.download_url) {
      await downloadJobFile(j.download_url, j.file_name ?? fallbackName);
      return j.done;
    }
    if (['completed', 'cancelled', 'failed'].includes(j.status)) return null;
    onProgress?.(j.done, j.total);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return null;
}
