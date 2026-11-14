// Tệp đính kèm của ô soạn Trợ lý (TIP-023c 8c → TIP-023f §1, §4.1-4.2): chọn / thả / dán → kiểm sớm (đuôi / cỡ / số / tổng — server kiểm
// lại theo nội dung) → tải lên staging `POST /files` (purpose attachment) → `assistant.attachment_prepare` (useAction) → hỏi trạng thái
// `GET /assistant/input/:id` tới ready / lỗi có lý do. Gửi lượt chỉ khi mọi tệp ready — lượt mang handle `{ artifact_id, revision }`.
// Bỏ: huỷ tải / đổi thế hệ (kết quả trễ không gắn lại); artifact nháp đã có → `attachment_remove` (không xoá tệp gốc). Đổi workspace →
// huỷ hết, nonce mới.
'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { InputArtifactDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { useMe } from '@/shared/shell/useShellData';
import { rejectReason, type AttachReject } from '@/shared/assistant/attachment-extensions';
import type { DraftAttachment, InputHandle } from '../input-types';
import { patchAttachment, useAttachStore } from './attachment-store';

export { useAttachStore } from './attachment-store';
export type PendingAttachment = DraftAttachment;

/** Hỏi trạng thái chuẩn bị: 1s / lần, tối đa 120 lần (parse có trần 30s ở worker; dư cho hàng đợi). */
export const POLL_MS = 1000;
const POLL_MAX = 120;
const DONE = new Set(['ready', 'unsupported', 'failed', 'cancelled']);
let seq = 0;
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((r) => {
    if (signal.aborted) return r();
    const t = setTimeout(r, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), r()), { once: true });
  });

type Mut = { artifact_id: string; revision: number; phase: DraftAttachment['phase'] };

export function useAssistantAttachments(onReject?: (name: string, why: AttachReject) => void) {
  const items = useAttachStore((s) => s.items);
  const ws = useMe().data?.current_workspace_id;
  const prepare = useAction<Mut>('assistant.attachment_prepare');
  const detach = useAction('assistant.attachment_remove');
  const files = useRef(new Map<string, File>());
  const aborts = useRef(new Map<string, AbortController>());
  const gens = useRef(new Map<string, number>());
  const boundWs = useRef(ws);

  const stopAll = useCallback(() => {
    aborts.current.forEach((a) => a.abort());
    aborts.current.clear();
    files.current.clear();
    gens.current.clear();
  }, []);
  useEffect(() => () => aborts.current.forEach((a) => a.abort()), []);
  useEffect(() => {
    // Không mang tệp qua workspace khác: huỷ thao tác trình duyệt, bỏ tham chiếu, nonce mới.
    if (ws && boundWs.current && boundWs.current !== ws) {
      stopAll();
      useAttachStore.getState().renew();
    }
    boundWs.current = ws;
  }, [ws, stopAll]);

  const run = useCallback(
    async (key: string) => {
      const f = files.current.get(key);
      if (!f) return;
      aborts.current.get(key)?.abort();
      const gen = (gens.current.get(key) ?? 0) + 1;
      gens.current.set(key, gen);
      const ac = new AbortController();
      aborts.current.set(key, ac);
      const live = () => !ac.signal.aborted && gens.current.get(key) === gen;
      const set = (p: Partial<DraftAttachment>) => {
        if (live()) patchAttachment(key, p);
      };
      set({ status: 'uploading', reason: undefined });
      try {
        let fileId = useAttachStore.getState().items.find((x) => x.key === key)?.file_id;
        if (!fileId) fileId = (await transport.upload(f, 'attachment', ac.signal)).file_id;
        if (!live()) return;
        set({ file_id: fileId, status: 'preparing' });
        const mut = await prepare.run({ file_id: fileId, draft_nonce: useAttachStore.getState().nonce }, { silent: true, onError: () => true });
        if (!mut) return set({ status: 'error', reason: 'prepare' });
        set({ artifact_id: mut.result.artifact_id, revision: mut.result.revision, phase: mut.result.phase });
        let a: InputArtifactDto | null = null;
        for (let i = 0; i < POLL_MAX && live(); i++) {
          a = await transport.get<InputArtifactDto>(`/assistant/input/${encodeURIComponent(mut.result.artifact_id)}`);
          if (DONE.has(a.phase)) break;
          await wait(POLL_MS, ac.signal);
        }
        if (!a || !live()) return;
        if (a.phase === 'ready') set({ status: 'ready', phase: a.phase, revision: a.revision });
        else set({ status: 'error', phase: a.phase, reason: a.error_reason ?? (DONE.has(a.phase) ? 'corrupt' : 'timeout') });
      } catch {
        set({ status: 'error', reason: 'upload' });
      } finally {
        if (gens.current.get(key) === gen) aborts.current.delete(key);
      }
    },
    [prepare],
  );

  const add = useCallback(
    (list: FileList | File[] | null) => {
      for (const f of Array.from(list ?? [])) {
        const cur = useAttachStore.getState().items;
        const why = rejectReason(f, cur.length, cur.reduce((n, x) => n + x.size, 0));
        if (why) {
          onReject?.(f.name, why);
          continue;
        }
        const key = `att${++seq}`;
        files.current.set(key, f);
        useAttachStore.getState().set((xs) => [...xs, { key, name: f.name, size: f.size, mime: f.type, status: 'uploading' }]);
        void run(key);
      }
    },
    [onReject, run],
  );

  /** Bỏ tệp: huỷ đang tải / đang hỏi, đổi thế hệ; artifact nháp đã có → tháo khỏi bản nháp (không xoá tệp gốc / lịch sử đã gửi). */
  const remove = useCallback(
    (key: string) => {
      const x = useAttachStore.getState().items.find((i) => i.key === key);
      aborts.current.get(key)?.abort();
      aborts.current.delete(key);
      gens.current.set(key, (gens.current.get(key) ?? 0) + 1);
      files.current.delete(key);
      useAttachStore.getState().set((xs) => xs.filter((i) => i.key !== key));
      if (x?.artifact_id && x.revision) void detach.run({ artifact_id: x.artifact_id, if_revision: x.revision }, { silent: true, onError: () => true });
    },
    [detach],
  );

  const clear = useCallback(() => {
    stopAll();
    useAttachStore.getState().renew();
  }, [stopAll]);

  return {
    items,
    add,
    remove,
    retry: (key: string) => void run(key),
    clear,
    /** Đang tải / đang chuẩn bị / lỗi → chưa gửi được lượt. */
    ready: items.every((x) => x.status === 'ready'),
    /** Handle gửi kèm lượt (server kiểm lại chủ / ready / revision / nguồn). */
    handles: (): InputHandle[] => handlesOf(useAttachStore.getState().items),
  };
}

export const handlesOf = (xs: readonly DraftAttachment[]): InputHandle[] => xs.filter((x) => x.status === 'ready' && x.artifact_id && x.revision).map((x) => ({ artifact_id: x.artifact_id!, revision: x.revision! }));
