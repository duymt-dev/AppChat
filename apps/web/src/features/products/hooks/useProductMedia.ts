// Ảnh / tài liệu sản phẩm (TIP-027b §3.1, §3.4): đọc khối `media` của chi tiết sản phẩm (quyền hiện hành phía server), tải lên
// `POST /v1/files` purpose `record_attachment` kèm đích product (chưa gắn) rồi gắn bằng `product.media_attach` với version bộ media (CAS).
// Lỗi / version lệch giữ id tệp đã tải để "Thử lại" gắn đúng tệp đó theo version mới — không tải lại mù. Đổi sản phẩm giữa chừng: kết quả
// muộn của sản phẩm cũ không ghi vào sản phẩm đang mở. Xem trước ảnh = bytes qua route đã kiểm quyền → object URL tạm, thu hồi khi đổi
// sản phẩm / gỡ / đóng — không link công khai.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiRequestError, type ProductMediaDto, type ProductMediaItemDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';

const REVOKE_MS = 60_000;

export type MediaOp =
  | { kind: 'idle' }
  | { kind: 'uploading'; name: string }
  | { kind: 'attaching'; name: string }
  | { kind: 'failed'; name: string; reason: string; fileId?: string }
  | { kind: 'stale'; name: string; fileId: string };

const reasonOf = (e: unknown): string => {
  if (!(e instanceof ApiRequestError)) return 'network';
  if (e.error.code === 'VALIDATION_ISOLATION_UNAVAILABLE') return 'unavailable';
  const f = e.error.fields ?? {};
  return f.file_id ?? f.file ?? f.image ?? f.document ?? f.media_id ?? (e.status === 413 ? 'too_large' : e.status === 415 ? 'type_not_allowed' : e.status === 403 ? 'forbidden' : 'failed');
};

/** Object URL xem trước cho ảnh sống — tải theo id tệp, thu hồi khi rời sản phẩm / ảnh bị gỡ / unmount. */
function usePreviews(productId: string, images: ProductMediaItemDto[]) {
  const [urls, setUrls] = useState<{ product: string; map: Record<string, string> }>({ product: productId, map: {} });
  const owned = useRef(new Map<string, string>());
  const ids = images.filter((m) => m.available).map((m) => m.file_id).join(',');
  useEffect(() => {
    let alive = true;
    const want = new Set(ids ? ids.split(',') : []);
    for (const [id, url] of owned.current) {
      if (want.has(id)) continue;
      URL.revokeObjectURL(url);
      owned.current.delete(id);
    }
    for (const id of want) {
      if (owned.current.has(id)) continue;
      void transport.blob(`/files/${id}`).then(
        (b) => {
          const url = URL.createObjectURL(b);
          if (!alive) return URL.revokeObjectURL(url);
          owned.current.set(id, url);
          setUrls({ product: productId, map: Object.fromEntries(owned.current) });
        },
        () => undefined,
      );
    }
    setUrls({ product: productId, map: Object.fromEntries(owned.current) });
    return () => {
      alive = false;
    };
  }, [productId, ids]);
  // Rời sản phẩm / đóng drawer → thu hồi toàn bộ.
  useEffect(() => {
    const map = owned.current;
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
      map.clear();
    };
  }, [productId]);
  return urls.product === productId ? urls.map : {};
}

export function useProductMedia(productId: string, media: ProductMediaDto | undefined) {
  const qc = useQueryClient();
  const attach = useAction('product.media_attach');
  const detach = useAction('product.media_detach');
  const reorder = useAction('product.media_reorder');
  const primary = useAction('product.media_set_primary');
  const [ops, setOps] = useState<{ product: string; op: MediaOp }>({ product: productId, op: { kind: 'idle' } });
  const op: MediaOp = ops.product === productId ? ops.op : { kind: 'idle' };
  const latest = useRef(productId);
  const version = useRef(media?.version ?? 0);
  useEffect(() => {
    latest.current = productId;
    version.current = media?.version ?? 0;
  }, [productId, media?.version]);

  const items = media?.items ?? [];
  const images = items.filter((m) => m.kind === 'image');
  const documents = items.filter((m) => m.kind === 'document');
  const previews = usePreviews(productId, images);
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['catalog', 'product', productId] }), [qc, productId]);

  /** Gắn tệp đã tải (staging) theo version bộ media mới nhất; 409 lệch version → tải lại danh sách, giữ id tệp để thử lại. */
  const attachFile = useCallback(
    async (fileId: string, name: string) => {
      const target = productId;
      const setOp = (o: MediaOp) => latest.current === target && setOps({ product: target, op: o });
      setOp({ kind: 'attaching', name });
      let failed: string | null = null;
      const r = await attach.run(
        { product_id: target, source: { kind: 'target_upload_handle', file_id: fileId }, if_version: version.current },
        {
          silent: true,
          onError: (e) => {
            failed = e.error.code === 'STALE_VERSION' ? 'stale' : reasonOf(e);
            return true;
          },
        },
      );
      if (r) {
        setOp({ kind: 'idle' });
        return true;
      }
      if (failed === 'stale') {
        await refresh();
        setOp({ kind: 'stale', name, fileId });
      } else setOp(failed ? { kind: 'failed', name, reason: failed, fileId } : { kind: 'idle' });
      return false;
    },
    [attach, productId, refresh],
  );

  const upload = useCallback(
    async (file: File) => {
      const target = productId;
      setOps({ product: target, op: { kind: 'uploading', name: file.name } });
      let fileId: string;
      try {
        fileId = (await transport.upload(file, 'record_attachment', undefined, { parent_type: 'product', parent_id: target })).file_id;
      } catch (e) {
        if (latest.current === target) setOps({ product: target, op: { kind: 'failed', name: file.name, reason: reasonOf(e) } });
        return false;
      }
      if (latest.current !== target) return false;
      return attachFile(fileId, file.name);
    },
    [attachFile, productId],
  );

  /** Thử lại đúng thao tác gắn trước (cùng id tệp, version hiện hành) — không chọn / tải lại tệp. */
  const retry = () => {
    if ((op.kind === 'failed' || op.kind === 'stale') && op.fileId) void attachFile(op.fileId, op.name);
  };

  const remove = useCallback(
    (m: ProductMediaItemDto) => detach.run({ product_id: productId, media_id: m.media_id, if_version: version.current }).then((r) => !!r),
    [detach, productId],
  );
  const makePrimary = useCallback(
    (m: ProductMediaItemDto) => primary.run({ product_id: productId, media_id: m.media_id, if_version: version.current }, { silent: true }).then((r) => !!r),
    [primary, productId],
  );
  /** Dời một mục lên / xuống trong cùng loại — gửi hoán vị đủ id sống của loại đó. */
  const move = useCallback(
    (m: ProductMediaItemDto, dir: -1 | 1) => {
      const list = (m.kind === 'image' ? images : documents).map((x) => x.media_id);
      const at = list.indexOf(m.media_id);
      const to = at + dir;
      if (at < 0 || to < 0 || to >= list.length) return Promise.resolve(false);
      [list[at], list[to]] = [list[to]!, list[at]!];
      return reorder.run({ product_id: productId, kind: m.kind, media_ids: list, if_version: version.current }, { silent: true }).then((r) => !!r);
    },
    [documents, images, productId, reorder],
  );

  /** Tải bytes qua route có xác thực (quyền xem sản phẩm hiện hành) rồi lưu — URL tạm thu hồi sau 60 giây. */
  const download = useCallback(async (m: ProductMediaItemDto) => {
    const url = URL.createObjectURL(await transport.blob(`/files/${m.file_id}`));
    const a = document.createElement('a');
    a.href = url;
    a.download = m.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
  }, []);

  return {
    images,
    documents,
    previews,
    canEdit: media?.can_edit ?? false,
    limits: media?.limits ?? { image: 10, document: 20 },
    op,
    clearOp: () => setOps({ product: productId, op: { kind: 'idle' } }),
    upload,
    retry,
    remove,
    makePrimary,
    move,
    download,
    busy: op.kind === 'uploading' || op.kind === 'attaching' || detach.isPending || reorder.isPending || primary.isPending,
  };
}

export type ProductMediaApi = ReturnType<typeof useProductMedia>;
