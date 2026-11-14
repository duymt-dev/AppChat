'use client';
// Xung đột phiên bản chung (concurrency §1, TIP-003e §2): action trả 409 STALE_VERSION mà màn không tự xử lý (`onError` của useAction trả
// false) → hộp "Bản ghi vừa được người khác cập nhật". "Tải lại" = làm mới truy vấn theo `invalidates` của action (người dùng chủ động);
// sau khi tải xong gọi `onReload` của lần chạy (form chốt version lúc mở → mở lại với bản mới, như useEditVersion);
// "Giữ bản của tôi" = đóng hộp, KHÔNG tự ghi đè — form vẫn mở nên nội dung đang nhập còn nguyên. Màn có xung đột riêng (đơn / hợp đồng —
// useEditVersion) vẫn tự hiển thị như cũ.
import { useCallback, useState } from 'react';
import { Modal } from 'antd';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getAction } from '@appchat/actions';
import { z } from '@appchat/ui';
import { matchesInvalidation } from '../api/query-keys';

interface StaleState {
  actionId: string | null;
  onReload: (() => void) | null;
  open: (actionId: string, onReload?: () => void) => void;
  close: () => void;
}

export const useStaleStore = create<StaleState>((set) => ({
  actionId: null,
  onReload: null,
  open: (actionId, onReload) => set({ actionId, onReload: onReload ?? null }),
  close: () => set({ actionId: null, onReload: null }),
}));

/**
 * Version chốt lúc MỞ form (refetch nền không đổi số này — không gửi mù bản mới). Gửi `ifVersion` + `onStaleReload` cho useAction.run:
 * "Tải lại" sau 409 → lấy version mới từ cache vừa làm mới, GIỮ nội dung đang nhập; lần lưu sau là quyết định có chủ ý của người dùng.
 */
export function usePinnedVersion(opened: number | undefined, queryKey: readonly unknown[], pick: (d: unknown) => number | undefined = (d) => (d as { version?: number } | undefined)?.version) {
  const qc = useQueryClient();
  const [base, setBase] = useState(opened);
  const key = JSON.stringify(queryKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onStaleReload = useCallback(() => setBase(pick(qc.getQueryData(JSON.parse(key) as unknown[]))), [qc, key]);
  return { ifVersion: base, onStaleReload };
}

/** useAction gọi khi nhận 409 STALE_VERSION chưa được màn xử lý. */
export const staleVersion = (actionId: string, onReload?: () => void): void => useStaleStore.getState().open(actionId, onReload);

export function StaleVersionModal() {
  const t = useTranslations();
  const qc = useQueryClient();
  const actionId = useStaleStore((s) => s.actionId);
  const close = useStaleStore((s) => s.close);
  const onReload = useStaleStore((s) => s.onReload);
  const def = actionId ? getAction(actionId) : undefined;
  const reload = async () => {
    const inv = def?.invalidates ?? [];
    await qc.invalidateQueries({ predicate: (q) => matchesInvalidation(inv, q.queryKey) });
    close();
    onReload?.();
  };
  return (
    <Modal
      open={!!actionId}
      title={t('actions.stale.title')}
      okText={t('actions.stale.reload')}
      cancelText={t('actions.stale.keep')}
      onOk={() => void reload()}
      onCancel={close}
      okButtonProps={{ 'data-testid': 'stale-reload' } as never}
      cancelButtonProps={{ 'data-testid': 'stale-keep' } as never}
      zIndex={z.modal}
      destroyOnHidden
    >
      <div data-testid="stale-version">{t('actions.stale.body', { title: def ? t(def.title as never) : '' })}</div>
    </Modal>
  );
}
