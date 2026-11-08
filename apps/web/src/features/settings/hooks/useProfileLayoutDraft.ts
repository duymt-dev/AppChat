// Bản nháp bố cục Hồ sơ 360° (TIP-026b §4.6): giữ baseVersion + nháp cục bộ, ghi tuần tự — một lệnh đang chạy, sửa tiếp trong lúc chờ gộp
// thành MỘT lần ghi kế (bản mới nhất), không bắn patch cả tab mỗi phím. Thành công → tiến version, xả nháp mới nhất. 409 → dừng tự lưu,
// giữ nháp, báo "đã có người sửa" (Tải lại / Ghi đè theo bản mới). Không báo thành công trước khi server xác nhận (202 chờ duyệt ≠ xong).
'use client';
import { useState } from 'react';
import type { ApiRequestError } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import type { LayoutTab } from '../types';

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

type Run = (input: unknown, opts: { silent: boolean; onError: (e: ApiRequestError) => boolean }) => Promise<{ result: { version?: number } } | null>;

/** Lõi thuần (test được không cần React): hàng đợi gộp + CAS. */
export function createDraftQueue(o: { layoutId: string; version: number | undefined; run: Run; onStatus: (s: DraftStatus) => void; onVersion: (v: number) => void }) {
  let base = o.version;
  let pending: LayoutTab[] | null = null;
  let inflight = false;
  let stopped = false;
  const flush = async (): Promise<void> => {
    if (inflight || stopped || !pending) return;
    const tabs = pending;
    pending = null;
    inflight = true;
    o.onStatus('saving');
    let conflict = false;
    const r = await o.run(
      { layout_id: o.layoutId, ...(base !== undefined ? { if_version: base } : {}), patch: { tabs } },
      {
        silent: true,
        onError: (e) => {
          if (e.error.code !== 'STALE_VERSION') return false;
          conflict = true;
          return true;
        },
      },
    );
    inflight = false;
    if (conflict) {
      stopped = true;
      pending = pending ?? tabs;
      o.onStatus('conflict');
      return;
    }
    if (!r) {
      pending = pending ?? tabs;
      o.onStatus('error');
      return;
    }
    if (typeof r.result.version === 'number') {
      base = r.result.version;
      o.onVersion(base);
    }
    if (pending) return flush();
    o.onStatus('saved');
  };
  return {
    push: (tabs: LayoutTab[]) => {
      pending = tabs;
      void flush();
    },
    /** Sau xung đột: lấy version mới của server rồi ghi lại nháp đang giữ (người dùng chọn Ghi đè). */
    rebase: (v: number | undefined) => {
      base = v;
      stopped = false;
      void flush();
    },
    get busy() {
      return inflight || !!pending;
    },
  };
}

export function useProfileLayoutDraft(layoutId: string, initial: LayoutTab[], version: number | undefined) {
  const update = useAction<{ layout_id: string; version?: number }>('profile_layout.update');
  const [tabs, setTabs] = useState(initial);
  const [status, setStatus] = useState<DraftStatus>('idle');
  // Hàng đợi tạo lần sửa đầu (trong handler sự kiện) và giữ cho cả phiên sửa — không tạo lại khi render.
  const [queue, setQueue] = useState<ReturnType<typeof createDraftQueue> | null>(null);
  const get = () => {
    if (queue) return queue;
    const q = createDraftQueue({ layoutId, version, run: (i, opts) => update.run(i, opts), onStatus: setStatus, onVersion: () => {} });
    setQueue(q);
    return q;
  };
  const edit = (next: LayoutTab[]) => {
    setTabs(next);
    get().push(next);
  };
  return { tabs, status, edit, rebase: (v: number | undefined) => get().rebase(v), busy: () => !!queue?.busy };
}
