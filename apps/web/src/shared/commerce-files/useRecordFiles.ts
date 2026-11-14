// Tệp đính kèm bản ghi (TIP-032d §3.1–3.2, §3.5): đọc qua `<loại>.files_list` (quyền hiện hành phía server — không tin metadata cũ trong
// cache), tải lên `POST /v1/files` purpose `record_attachment` kèm đích (chưa gắn), rồi gắn bằng `<loại>.file_attach` với revision bộ tệp
// (CAS); gỡ bằng `<loại>.file_detach` + if_version sau khi người dùng xác nhận. Đổi bản ghi giữa chừng: kết quả muộn của bản ghi cũ không
// ghi vào bản ghi đang mở (khoá theo loại + id + thế hệ). Tải về đọc bytes qua route đã kiểm quyền bản ghi, không link công khai.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@appchat/shared';
import { transport } from '../api/client';
import { useAction } from '../actions/useAction';
import type { PanelOp, RecordFile, RecordFilePage, RecordRef } from './types';

const REVOKE_MS = 60_000;
const PAGE = 20;

/** Khoá cache theo module của bản ghi — action gắn / gỡ invalidates ['orders'] / ['invoices'] làm mới panel. */
export const recordFilesKey = (r: RecordRef) => [r.type === 'order' ? 'orders' : 'invoices', 'record-files', r.id] as const;

async function page(r: RecordRef, cursor: string): Promise<RecordFilePage> {
  const res = await transport.action<RecordFilePage>(`${r.type}.files_list`, { [`${r.type}_id`]: r.id, limit: PAGE, ...(cursor ? { cursor } : {}) });
  return res.status === 200 ? res.data.result : { files: [], revision: 0, can_attach: false, next_cursor: null };
}

const reasonOf = (e: unknown): string => {
  if (!(e instanceof ApiRequestError)) return 'network';
  if (e.error.code === 'VALIDATION_ISOLATION_UNAVAILABLE') return 'unavailable';
  const f = e.error.fields ?? {};
  return f.file_id ?? f.file ?? (e.status === 413 ? 'too_large' : e.status === 415 ? 'type_not_allowed' : e.status === 403 ? 'forbidden' : 'failed');
};

export function useRecordFiles(ref: RecordRef) {
  const qc = useQueryClient();
  const attach = useAction(`${ref.type}.file_attach`);
  const detach = useAction(`${ref.type}.file_detach`);
  const target = `${ref.type}:${ref.id}`;
  // Trạng thái thao tác gắn bản ghi lúc bấm: đổi bản ghi → không hiện trạng thái cũ; kết quả muộn của bản ghi cũ ghi vào bản ghi cũ.
  const [ops, setOps] = useState<{ target: string; op: PanelOp }>({ target, op: { kind: 'idle' } });
  const op: PanelOp = ops.target === target ? ops.op : { kind: 'idle' };
  const latest = useRef(target);
  useEffect(() => {
    latest.current = target;
  }, [target]);

  const q = useInfiniteQuery({
    queryKey: recordFilesKey(ref),
    queryFn: ({ pageParam }) => page(ref, pageParam),
    initialPageParam: '',
    getNextPageParam: (p) => p.next_cursor ?? undefined,
  });
  const first = q.data?.pages[0];
  const files: RecordFile[] = q.data?.pages.flatMap((p) => p.files) ?? [];

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: recordFilesKey(ref) }), [qc, ref]);

  /** Chọn tệp → tải staging cho đúng bản ghi → gắn theo revision đang thấy. Lỗi giữ tên tệp để người dùng chọn lại, không gắn trùng. */
  const upload = useCallback(
    async (file: File) => {
      const live = () => latest.current === target;
      const setOp = (o: PanelOp) => setOps({ target, op: o });
      setOp({ kind: 'uploading', name: file.name });
      let fileId: string;
      try {
        fileId = (await transport.upload(file, 'record_attachment', undefined, { parent_type: ref.type, parent_id: ref.id })).file_id;
      } catch (e) {
        if (live()) setOp({ kind: 'failed', name: file.name, reason: reasonOf(e) });
        return false;
      }
      if (!live()) return false;
      setOp({ kind: 'attaching', name: file.name });
      let failed: string | null = null;
      const r = await attach.run(
        { [`${ref.type}_id`]: ref.id, source: { kind: 'target_upload_handle', file_id: fileId }, if_revision: first?.revision ?? 0 },
        {
          silent: true,
          onError: (e) => {
            failed = e.error.code === 'STALE_VERSION' ? 'stale' : reasonOf(e);
            return true;
          },
        },
      );
      if (!live()) return false;
      if (r) {
        setOp({ kind: 'idle' });
        await refresh();
        return true;
      }
      if (failed === 'stale') {
        setOp({ kind: 'stale' });
        await refresh();
      } else setOp(failed ? { kind: 'failed', name: file.name, reason: failed } : { kind: 'idle' });
      return false;
    },
    [attach, first?.revision, ref, refresh, target],
  );

  const remove = useCallback(
    async (f: RecordFile) => {
      if (!f.attachment_id || f.version === null) return false;
      const r = await detach.run({ [`${ref.type}_id`]: ref.id, attachment_id: f.attachment_id, if_version: f.version });
      await refresh();
      return !!r;
    },
    [detach, ref, refresh],
  );

  /** Tải bytes qua route có xác thực (quyền đọc bản ghi hiện hành) — không link công khai dài hạn. */
  const download = useCallback(async (f: RecordFile) => {
    const url = URL.createObjectURL(await transport.blob(`/files/${f.file_id}`));
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
  }, []);

  return {
    files,
    canAttach: first?.can_attach ?? false,
    op,
    clearOp: () => setOps({ target, op: { kind: 'idle' } }),
    upload,
    remove,
    download,
    isLoading: q.isPending,
    isError: q.isError,
    refetch: () => void q.refetch(),
    more: q.hasNextPage ? () => void q.fetchNextPage() : null,
    busy: op.kind === 'uploading' || op.kind === 'attaching' || detach.isPending,
  };
}
