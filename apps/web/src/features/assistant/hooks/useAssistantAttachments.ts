// Tệp đính kèm của ô soạn Trợ lý (TIP-023c 8c): chọn → kiểm sớm (mime / cỡ / số lượng) → tải lên ngay `POST /files` (purpose
// attachment) → giữ `file_id`. Trạng thái mỗi tệp: uploading / ready / error; huỷ (AbortController) / thử lại / bỏ. Gửi lượt chỉ khi
// mọi tệp ready — lượt mang `{ id, name }`, server kiểm lại bằng guard (tên client không được tin). Không giữ URL lưu trữ.
'use client';
import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { transport } from '@/shared/api/client';
import { rejectReason, type AttachReject } from '@/shared/assistant/attachment-extensions';

export interface PendingAttachment {
  key: string;
  name: string;
  size: number;
  mime: string;
  status: 'uploading' | 'ready' | 'error';
  file_id?: string;
}

interface AttachState {
  items: PendingAttachment[];
  set: (fn: (xs: PendingAttachment[]) => PendingAttachment[]) => void;
}

export const useAttachStore = create<AttachState>((set) => ({ items: [], set: (fn) => set((s) => ({ items: fn(s.items) })) }));

let seq = 0;

export function useAssistantAttachments(onReject?: (name: string, why: AttachReject) => void) {
  const items = useAttachStore((s) => s.items);
  const files = useRef(new Map<string, File>());
  const aborts = useRef(new Map<string, AbortController>());
  useEffect(() => () => aborts.current.forEach((a) => a.abort()), []);

  const patch = (key: string, p: Partial<PendingAttachment>) => useAttachStore.getState().set((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const upload = useCallback(async (key: string) => {
    const f = files.current.get(key);
    if (!f) return;
    const ac = new AbortController();
    aborts.current.set(key, ac);
    patch(key, { status: 'uploading' });
    try {
      const up = await transport.upload(f, 'attachment', ac.signal);
      if (!ac.signal.aborted) patch(key, { status: 'ready', file_id: up.file_id });
    } catch {
      if (!ac.signal.aborted) patch(key, { status: 'error' });
    } finally {
      aborts.current.delete(key);
    }
  }, []);

  const add = useCallback(
    (list: FileList | File[] | null) => {
      for (const f of Array.from(list ?? [])) {
        const why = rejectReason(f, useAttachStore.getState().items.length);
        if (why) {
          onReject?.(f.name, why);
          continue;
        }
        const key = `att${++seq}`;
        files.current.set(key, f);
        useAttachStore.getState().set((xs) => [...xs, { key, name: f.name, size: f.size, mime: f.type, status: 'uploading' }]);
        void upload(key);
      }
    },
    [onReject, upload],
  );

  /** Bỏ tệp (huỷ nếu đang tải). Tệp đã tải mà bỏ → không xoá ở server (chưa xác nhận — hết hạn theo guard). */
  const remove = useCallback((key: string) => {
    aborts.current.get(key)?.abort();
    files.current.delete(key);
    useAttachStore.getState().set((xs) => xs.filter((x) => x.key !== key));
  }, []);

  const clear = useCallback(() => {
    aborts.current.forEach((a) => a.abort());
    files.current.clear();
    useAttachStore.getState().set(() => []);
  }, []);

  return {
    items,
    add,
    remove,
    retry: (key: string) => void upload(key),
    clear,
    /** Đang tải / lỗi → chưa gửi được lượt. */
    ready: items.every((x) => x.status === 'ready'),
    /** Tệp gửi kèm lượt (chỉ id + tên). */
    payload: () => useAttachStore.getState().items.filter((x) => x.status === 'ready' && x.file_id).map((x) => ({ id: x.file_id!, name: x.name })),
  };
}
